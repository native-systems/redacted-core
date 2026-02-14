import { useEffect, useMemo, useReducer, useRef } from "react"
import { create, StoreApi } from "zustand"


class UndefinedValueType {}
const UNDEFINED_VALUE = new UndefinedValueType()

type DisposeCallback<T> = (resource: T) => void

/**
 * Holds a handle to a disposable resource.
 * The resource is disposed of when the last client detaches from it.
 * @template T the resource type
 */
export class ResourceHandle<out T> {
  public readonly resource: T
  private readonly dispose: () => void
  private counter: number

  /**
   * Creates a resource handle.
   * @template T the resource type
   * @param resource The resource to handle
   * @param dispose A callback function that will dispose of the resource
   */
  static create<T> (value: T, dispose: DisposeCallback<T> = () => undefined) {
    // Using this factory function allows us to avoid having a
    // `DisposeCallback<T>` attribute in the class, which would break its
    // covariance
    return new ResourceHandle<T>(value, () => dispose(value))
  }

  private constructor (resource: T, dispose: () => void) {
    this.resource = resource
    this.dispose = dispose
    this.counter = 0
  }

  /**
   * Increments the reference counter.
   */
  public attach () {
    this.counter++
  }

  /**
   * Decrements the reference counter.
   * If it drops to zero, disposes of the resource.
   */
  public detach () {
    this.counter--
    if (!this.counter)
      this.dispose()
  }
}

/**
 * Returns true if the passed object is a resource handle.
 * @param object The object to evaluate
 */
export const isResourceHandle =
  (object: any) => object instanceof ResourceHandle

interface InvalidateSignalStore { send (): void }
interface ReadyStateSignalStore { ready: boolean; send (ready: boolean): void }

type ListenerCallback<Store> = (store: Store) => void
type UnsubscribeCallback = () => void

/**
 * Represents a value or resource whose identity remains stable accross renders
 * and can be used as the source of other derivated values.
 * @template T the value type
 */
export abstract class Volatile<T> {
  /**
   * Merges several volatiles into one, array-like derivated volatile.
   * @template U the source volatile value types
   * @param volatiles the source volatiles
   * @returns a derivated volatile
   */
  static merge <U extends readonly unknown[]> (
    ...volatiles: { [K in keyof U]: Volatile<U[K]>}
  ): MergedVolatiles<U> {
    return new MergedVolatiles<U>(...volatiles)
  }

  /**
   * Tests whether the volatile value is ready for use.
   * @returns true if the volatile is ready, false otherwise
   */
  abstract ready (): boolean

  /**
   * Returns the current value of the volatile. If the volatile holds a resource
   * handle, the resource itself is returned.
   * @returns the volatile value
   */
  abstract current (): T | UndefinedValueType

  private readonly invalidateSignal: StoreApi<InvalidateSignalStore>
  private readonly readyStateSignal: StoreApi<ReadyStateSignalStore>

  constructor () {
    this.invalidateSignal = create((set) => ({ send: () => set({ }) }))
    this.readyStateSignal = create(
      (set) => ({ ready: false, send: (ready) => set({ ready }) })
    )
  }

  /**
   * Used for internal purposes.
   */
  public subscribeReadyStateChange (
    callback: ListenerCallback<ReadyStateSignalStore>
  ): UnsubscribeCallback {
    return this.readyStateSignal.subscribe(callback)
  }

  protected signalReadyStateChange () {
    this.readyStateSignal.getState().send(this.ready())
  }

  /**
   * Used for internal purposes.
   */
  public subscribeInvalidation (
    callback: ListenerCallback<InvalidateSignalStore>
  ): UnsubscribeCallback {
    return this.invalidateSignal.subscribe(callback)
  }

  protected signalInvalidation () {
    this.invalidateSignal.getState().send()
  }

  /**
   * Used for internal purposes.
   */
  public getAuxiliaries (): Set<Volatile<void>> {
    return new Set()
  }
}

/**
 * Retrieves the value type of a Volatile type.
 * @template Type the volatile type to retrieve the value type from
 */
export type ValueType<Type> = Type extends Volatile<infer T>? T: never

export class RootVolatile<T> extends Volatile<T> {
  private value: T | UndefinedValueType
  private auxiliary?: Volatile<void>

  constructor (value: T | typeof UNDEFINED_VALUE = UNDEFINED_VALUE) {
    super()
    this.value = value
    this.auxiliary = undefined
  }

  public ready () {
    return this.current() !== UNDEFINED_VALUE
  }

  public current (): T | UndefinedValueType {
    return this.value
  }

  /**
   * Sets the volatile value and its readiness to true. If the previous value
   * is a resource handle, detaches from it. If the new value is a resource
   * handle, attaches to it.
   * @template T the value type
   * @param value the value to set
   */
  public set (value: T | UndefinedValueType): void {
    const previousReady = this.ready()
    if (isResourceHandle(this.value))
      this.value.detach()
    this.value = value
    if (isResourceHandle(this.value))
      this.value.attach()
    if (previousReady !== this.ready())
      this.signalReadyStateChange()
    this.signalInvalidation()
  }

  /**
   * Unsets the volatile value and sets its readiness to false.
   */
  public unset (): void {
    this.set(UNDEFINED_VALUE)
  }

  /**
   * Used for internal purposes.
   */
  setAuxiliary (auxiliary: Volatile<void>) {
    this.auxiliary = auxiliary
  }

  getAuxiliaries () {
    return new Set(this.auxiliary? [this.auxiliary]: [])
  }
}

type SourceArray<T> = { [K in keyof T]: Volatile<T[K]> }

abstract class DerivatedVolatileBase<T, S extends readonly unknown[]>
extends Volatile<T> {
  protected readonly sources: SourceArray<S>
  protected initialized: boolean
  protected readySet: boolean
  protected readyStateUnsubscribe?: Array<UnsubscribeCallback>
  protected invalidated: boolean
  protected unsubscribeInvalidations?: Array<UnsubscribeCallback>

  constructor (...sources: SourceArray<S>) {
    super()
    this.sources = sources
    this.initialized = false
    this.readySet = false
    this.readyStateUnsubscribe = undefined
    this.invalidated = false
  }

  private initialize (...sources: SourceArray<S>) {
    sources.forEach(
      (source) =>
        source instanceof DerivatedVolatileBase
          && source.ensureInitialized()
    )
    const computeReadyFromSources =
      () => !!(sources.length)
        && sources.find((source) => !source.ready()) === undefined
    this.readySet = computeReadyFromSources()
    this.readyStateUnsubscribe = sources.map(
      (source) => source.subscribeReadyStateChange(({ ready }) => {
        if (this.readySet && !ready) {
          // If the node was previously ready and is not ready anymore,
          // notify the whole subtree
          this.readySet = false
          this.signalReadyStateChange()
        } else if (!this.readySet && ready) {
          // If the node was previously not ready and is now ready, check
          // whether all the sources are ready then notify the subtree if
          // it is the case
          this.readySet = computeReadyFromSources()
          if (this.readySet)
            this.signalReadyStateChange()
        }
      })
    )
    this.invalidated = true
    this.unsubscribeInvalidations = sources.map(
      (source) => source.subscribeInvalidation(() => {
        const previousInvalidated = this.invalidated
        this.invalidated = true
        if (!previousInvalidated)
          this.signalInvalidation()
      })
    )
    this.signalReadyStateChange()
  }

  public ensureInitialized () {
    if (this.initialized)
      return
    this.initialize(...this.sources)
    this.initialized = true
  }

  public dispose () {
    this.unsubscribeInvalidations?.forEach((unsubscribe) => unsubscribe())
    this.readyStateUnsubscribe?.forEach((unsubscribe) => unsubscribe())
    this.initialized = false
  }

  public ready () {
    return this.readySet
  }
}

class DerivatedVolatile<T, S> extends DerivatedVolatileBase<T, [S]> {
  private readonly source: Volatile<S>
  private value: T | UndefinedValueType
  private auxiliaries?: Set<Volatile<void>>
  private compute: (value: S) => T

  constructor (source: Volatile<S>, compute: (value: S) => T) {
    super(source)
    this.source = source
    this.compute = compute
    this.value = UNDEFINED_VALUE
    this.auxiliaries = undefined
  }

  public current (): T | UndefinedValueType {
    if (this.invalidated && this.ready()) {
      const newValue = this.compute(this.source.current() as S)
      if (isResourceHandle(this.value))
        this.value.detach()
      this.value = newValue
      if (isResourceHandle(this.value))
        this.value.attach()
      this.invalidated = false
    }
    return isResourceHandle(this.value)? this.value.resource: this.value
  }

  public dispose () {
    if (isResourceHandle(this.value)) {
      this.value.detach()
      this.value = UNDEFINED_VALUE
    }
    super.dispose()
  }

  public getAuxiliaries () {
    if (this.auxiliaries === undefined)
      this.auxiliaries = this.source.getAuxiliaries()
    return this.auxiliaries
  }

  public rebind (compute: (value: S) => T) {
    this.compute = compute
  }
}

class MergedVolatiles<S extends readonly unknown[]>
extends DerivatedVolatileBase<S, S> {
  private value: S | UndefinedValueType
  private auxiliaries?: Set<Volatile<void>>

  constructor (...sources: SourceArray<S>) {
    super(...sources)
    this.auxiliaries = undefined
    this.value = UNDEFINED_VALUE
  }

  public current (): S | UndefinedValueType {
    if (this.invalidated && this.ready()) {
      this.value = this.sources.map((source) => source.current())
      this.invalidated = false
    }
    return this.value
  }

  public getAuxiliaries() {
    if (this.auxiliaries === undefined) {
      this.auxiliaries = new Set()
      this.sources.forEach(
        (source) => source.getAuxiliaries().forEach(
          (auxiliary) => this.auxiliaries!.add(auxiliary)
        )
      )
    }
    return this.auxiliaries
  }
}

/**
 * Tests whether the given object is any kind of volatile - source, derivated,
 * or merged.
 * @param object the object to test
 * @returns `true` if the object is a volatile, `false` otherwise
 */
export const isVolatile = (object: any): boolean =>
  object instanceof Volatile

/**
 * Returns the resource held by a handle in a volatile.
 * @param value the volatile to retrieve the value from
 * @param _default an optional default value
 */
export function get <T, D = never> (
  value: Volatile<ResourceHandle<T>>,
  _default?: D
): T | D

/**
 * Returns a volatile value.
 * @param value the volatile to retrieve the value from
 * @param _default an optional default value
 */
export function get <T, D = never> (value: Volatile<T>, _default?: D): T | D

/**
 * Returns a static or volatile value.
 * @param value the static or volatile to retrieve the value from
 * @param _default an optional default value
 */
export function get <T, D = never> (
  value: PotentialVolatile<T>,
  _default?: D
): T | D

/**
 * Returns a value.
 * @param value the value to return
 * @param _default this parameter will be ignored
 */
export function get <T, D = never> (value: T, _default?: D): T | D

/**
 * Helper function to retrieve the actual value from a potential volatile, or
 * the resource if it is a resource handle wrapped in a volatile. If not ready
 * and no default value is supplied, throws an error.
 * @param object the object to retrieve the value from
 * @param _default a default value to return if the volatile is not ready
 * @returns the volatile or resource handle value or the object itself
 */
export function get (object: any, _default: any = UNDEFINED_VALUE) {
  if (!isVolatile(object))
    return object
  if (!object.ready()) {
    if (_default !== UNDEFINED_VALUE)
      return _default
    throw new Error("Attempted to access a non-ready volatile")
  }
  return isResourceHandle(object.current())
    ? object.current().resource
    : object.current()
}

/**
 * Hook that returns whether the specified volatile is ready for use.
 * @param volatile the volatile to monitor the readiness from
 * @returns `true` if the volatile is ready for use, `false` otherwise
 */
export const useVolatileReady = (volatile: Volatile<any>): boolean => {
  // TODO: review this
  // We use this instead of useState to take into account situations where
  // the volatile readiness might change and not trigger a setState (e.g.
  // change being done after RSC listener was detached). Clients of this
  // function expect the symbol to always have a correct value.
  const [, updateState] = useReducer((x: number) => x + 1, 0)
  const ready = volatile.ready()
  useEffect(() => {
    if (volatile.ready() !== ready)
      updateState()
    const unsubscribe = volatile.subscribeReadyStateChange(() => {
      if (volatile.ready() !== ready)
        updateState()
    })
    return () => unsubscribe()
  }, [volatile, ready])
  return ready
}

/**
 * Represents the union of a value type and its volatile.
 * @template T the value type
 */
export type PotentialVolatile<T> = T | Volatile<T>

/**
 * Hook that instantiates a volatile and optionally assigns an initial value to
 * it. The volatile is unset on unmount. If the initial value is itself a
 * volatile, it is simply returned and the set/unset logic is skipped.
 * @template T the value type
 * @param initial the initial value (optional)
 * @returns the instantiated volatile
 */
export const useVolatile = <T> (
  initial: PotentialVolatile<T> | UndefinedValueType = UNDEFINED_VALUE
): RootVolatile<T> => {
  const initialIsVolatile = isVolatile(initial)
  const volatile = useRef(
    initialIsVolatile? initial: new RootVolatile()
  ).current as RootVolatile<T>

  useEffect(() => {
    if (initialIsVolatile)
      return
    // Something else (e.g. a child component) may have set a value to this
    // volatile before this effect got a chance to run; do not overwrite it.
    if (!volatile.ready())
      volatile.set(initial)
    return () => volatile.unset()
  }, [volatile])

  return volatile
}

/**
 * Hook that creates a volatile whose value is derivated from another volatile.
 * @template T the derivated volatile value type
 * @template S the source volatile value type
 * @param volatile the source volatile
 * @param compute the function that computes the derivated volatile value
 * @param deps an optional dependency array
 * @param stable identity stays the same if compute changes (`false` by default)
 * @returns 
 */
export function useDerivatedVolatile<T, S> (
  volatile: Volatile<S>,
  compute: (source: S) => T,
  deps?: any[],
  stable?: boolean
): DerivatedVolatile<T, S>
/**
 * Hook that creates a volatile whose value is derivated from several other
 * volatiles. Those volatiles must be grouped together into a single array. The
 * `compute` function will receive passed volatile values as distinct arguments.
 * @template T the derivated volatile type
 * @template S the tuple of source volatile value types
 * @param array the array of source volatiles
 * @param compute the function that computes the derivated volatile value
 * @param deps an optional dependency array
 * @param stable identity stays the same if compute changes (`false` by default)
 * @returns 
 */
export function useDerivatedVolatile<T, S extends readonly unknown[]> (
  volatileArray: SourceArray<S>,
  compute: (...sources: S) => T,
  deps?: any[],
  stable?: boolean
): DerivatedVolatile<T, S>

export function useDerivatedVolatile<T, S> (
  volatileOrArray: any,
  compute: (...a: any[]) => T,
  deps: any[] = [],
  stable: boolean = false
): DerivatedVolatile<T, S> {
  const volatile = useMemo(
    () => 
      Array.isArray(volatileOrArray)
        ? Volatile.merge(...volatileOrArray)
        : volatileOrArray,
    Array.isArray(volatileOrArray)
      ? volatileOrArray
      : [volatileOrArray]
  )
  const computeWrapper = useMemo(
    () =>
      volatile instanceof MergedVolatiles
        ? (a: S) => compute.apply(null, a as S[])
        : compute,
    [volatile, ...deps]
  )
  const derivatedVolatile = useMemo(
    () => new DerivatedVolatile(volatile, computeWrapper),
    stable? [volatile]: [volatile, computeWrapper]
  )
  derivatedVolatile.rebind(computeWrapper)
  useEffect(() => {
    derivatedVolatile.ensureInitialized()
    return () => derivatedVolatile.dispose()
  }, [derivatedVolatile])
  return derivatedVolatile
}

/**
 * Similar to `useDerivatedVolatile` but expects a compute function that returns
 * `void` and calls a callback to set the value instead. This callback is
 * provided as the last argument to the `compute` function.
 * @template T the derivated volatile value type
 * @template S the source volatile value type
 * @param volatile the source volatile
 * @param compute the function that computes the derivated volatile value
 * @param deps an optional dependency array
 */
export function useDelayedDerivatedVolatile<T, S> (
  volatile: Volatile<S>,
  compute: (source: S, callback: (value: T) => void) => void,
  deps?: any[]
): Volatile<T>
/**
 * Similar to `useDerivatedVolatile` but expects a compute function that returns
 * `void` and calls a callback to set the value instead. This callback is
 * provided as the last argument to the `compute` function.
 * @template T the source volatile type
 * @template S the tuple of source volatile value types
 * @param volatileArray the array of source volatiles
 * @param compute The function that computes the derivated volatile value
 * @param deps An optional dependency array
 */
export function useDelayedDerivatedVolatile<T, S extends readonly unknown[]> (
  volatileArray: SourceArray<S>,
  compute: ((...sources: [...S, (value: T) => void]) => void),
  deps?: any[]
): Volatile<T>

export function useDelayedDerivatedVolatile<T> (
  volatileOrArray: any,
  compute: (...a: any[]) => void,
  deps: any[] = []
): Volatile<T> {
  const volatile = useVolatile<T>()
  const auxiliary = useDerivatedVolatile(volatileOrArray, (...a: any[]) => {
    compute.apply(null, [...a, (value: any) => volatile.set(value)])
  }, deps)
  volatile.setAuxiliary(auxiliary)
  return volatile
}
