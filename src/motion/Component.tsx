import React, { createContext, forwardRef, useContext, useEffect,
  useImperativeHandle, useMemo, useRef, ReactNode, RefAttributes, ReactElement,
  ComponentType, ComponentProps as ReactComponentProps, ComponentPropsWithRef,
  RefObject } from "react"

import { isVolatile, PotentialVolatile, useDerivatedVolatile, useVolatileReady,
  Volatile } from "./Volatile"
import { Position3ValueType, Positionable, Scale3ValueType, Scalable }
  from "../primitives/ValueTypes"
import { Vector3ConstructorExtended } from "../primitives/Constructors"


type RegisterCallback = (volatile: Volatile<any>) => () => void

const ComponentVolatileRegistryContext = createContext({
  register: (_: Volatile<any>) => () => {}
})

type ComponentVolatileRegistryProps = {
  register: RegisterCallback
  children: ReactNode
}

/**
 * Exposes a volatile registry context to the children of this component.
 * `Resolve` component will call `register` to bind a volatile to the registry.
 * `register` must return a callback function to unregister the volatile.
 * @param props.register the register function
 */
export const ComponentVolatileRegistry = (
  { register, children }: ComponentVolatileRegistryProps
) => (
  <ComponentVolatileRegistryContext.Provider
    value={useMemo(() => ({ register }), [register])}
    >
    {children}
  </ComponentVolatileRegistryContext.Provider>
)

type ResolveProps = {
  volatile: Volatile<any>
}

/**
 * Binds a volatile to the current registry, instructing the renderer to compute
 * its value before render.
 * @param props.volatile The volatile whose value should be computed
 */
export const Resolve = ({ volatile }: ResolveProps) => {
  const { register } = useContext(ComponentVolatileRegistryContext)
  useEffect(() => {
    const unregister = register(volatile)
    return () => unregister()
  }, [volatile, register])
  return <></>
}

interface RequireProps {
  volatile: Volatile<any>
  children?: ReactNode
}

/**
 * Blocks a part of the component tree until a volatile is ready.
 * @param props.volatile The volatile which will be awaited
 * @param props.children The child component tree which has a dependency on it
 */
export const Require = ({ volatile, children }: RequireProps) => (
  <>
    <Resolve volatile={volatile} />
    {useVolatileReady(volatile)? <>{children}</>: <></>}
  </>
)

type ExtractRefValueType<T> = T extends RefObject<infer V>? V: never

type ComputeVolatileCallback<S, I, R> = (
  ((value: S, instance?: I) => R | undefined) | ((value: S) => R | undefined)
)

/**
 * Helper props type used to extract types from client components.
 * @template S the source volatile value type
 * @template C the Class component type
 * @template R the return type of computeVolatile
 */
type VolatileAttributeComponentProps<S, C extends ComponentType<any>, R> = {
  Class: C
  volatile: Volatile<S>
  computeVolatile: ComputeVolatileCallback<
    NoInfer<S>,
    ExtractRefValueType<ComponentPropsWithRef<C>["ref"]>,
    R
  >
} & Omit<ReactComponentProps<C>, keyof NoInfer<R>>

// Props type allowing bypass of type checks
type VolatileAttributeComponentAnyProps = {
  Class: any,
  volatile: any,
  computeVolatile: (value: any, instance?: any) => any
}

// Actual implementation of a `VolatileAttributeComponent`, only mounted when
// the associated volatile is ready. It's not clear whether there's any gain
// from attempting to "type" this function; we need to type assert anyway due
// to the use of forwardRef + the many issues that arise from having generics
// and Omit constructs that the compiler does not understand well, as is the
// case for the components that follow.
const ReadyVolatileAttributeComponent =
  forwardRef<unknown, VolatileAttributeComponentAnyProps>(
    <S, C extends ComponentType<any>, R> (
      props: VolatileAttributeComponentProps<S, C, R>,
      ref: ComponentPropsWithRef<C>["ref"]
    ) => {
      const { Class, volatile, computeVolatile, ...otherProps } = props
      const childRef = useRef(null)
      const initialValues = useMemo(
        () => computeVolatile(volatile.current() as S),
        // ^ This component is never mounted before the volatile is ready
        [volatile]
      )
      useImperativeHandle(ref, () => childRef.current)
      const symbol = useDerivatedVolatile(volatile, (value) => {
        if (!childRef.current || !volatile.ready())
          return
        const computedValues = computeVolatile(value, childRef.current)
        if (computedValues)
          Object.assign(childRef.current, computedValues)
      }, [volatile, computeVolatile])
      const childProps = {
        ref: childRef,
        ...initialValues,
        ...otherProps
      } as ComponentPropsWithRef<C>
      return (
        <>
          <Class {...childProps} />
          <Resolve volatile={symbol} />
        </>
      )
    }
  ) as <S, C extends ComponentType<any>, R> (
    props: VolatileAttributeComponentProps<S, C, R> & RefAttributes<any>
  ) => ReactElement

/**
 * Returns a component in which one or several properties are computed from
 * a source volatile. The component is only mounted when the source volatile
 * is ready. A compute function that takes, in this order, a value and the
 * instance of the underlying component, must be specified.
 * 
 * On first render, the object is `undefined` and the function must return an
 * object containing each property to inject into the component. For the next
 * runs, if an object is returned by the function, its properties will be used
 * to update the component.
 * 
 * @template S the source volatile value type
 * @template C the Class component type
 * @template R the compute function return type
 * @param props.Class the component that will receive a volatile-based attribute
 * @param props.volatile the source volatile
 * @param props.computeVolatile the compute function
 */
export const VolatileAttributeComponent = (
  <S, C extends ComponentType<any>, R> (
    props: VolatileAttributeComponentProps<S, C, R>
  ) => (
    <Require volatile={props.volatile}>
      <ReadyVolatileAttributeComponent<S, C, R> {...props} />
    </Require>
  )
)

/**
 * Same as `VolatileAttributeComponentProps` with an added a string type that
 * represents the volatile attribute.
 * @template S the source volatile value type
 * @template C the Class component type
 * @template A the attribute string type
 * @template R the compute function return type
 */
type OptionalVolatileAttributeComponentProps<
  S,
  C extends ComponentType<any>,
  A extends string,
  R
> = {
  Class: C
  volatile: PotentialVolatile<S>
  volatileAttribute: A
  computeVolatile: ComputeVolatileCallback<
    NoInfer<S>,
    ExtractRefValueType<ComponentPropsWithRef<C>["ref"]>,
    R
  >
} & Omit<ReactComponentProps<C>, A>

// Instantiates a `VolatileAttributeComponent` if the passed property is a
// volatile; instantiantes the `Class` component otherwise.
const OptionalVolatileAttributeComponent = (
  <S, C extends ComponentType<any>, A extends string, R> (
    props: OptionalVolatileAttributeComponentProps<S, C, A, R>
  ) => {
    const {
      Class,
      volatile,
      volatileAttribute,
      computeVolatile,
      ...otherProps
    } = props
    if (!volatile || !isVolatile(volatile)) {
      const childProps = { ...otherProps, [volatileAttribute]: volatile }
      return <Class {...childProps as ReactComponentProps<C>} />
    }
    const volatileProps = {
      Class,
      volatile,
      computeVolatile,
      // TODO: check whether there's a way to avoid this ugly cast
      ...otherProps as unknown as Omit<ReactComponentProps<C>, keyof R>
    } as VolatileAttributeComponentProps<S, C, R>
    return <VolatileAttributeComponent<S, C, R> {...volatileProps} />
  }
)

type ReplacedAttributeProps<S, A extends string, P> =
  { [K in A]?: PotentialVolatile<S> } & Omit<P, A>

type TypeHolder<S, A extends string, C> = C & { __type_info__?: [S, A] }

// Creates a component class for the specified attribute, default value and
// compute function.
const VolatileAttributeComponentFactory = (
  <S, I, A extends string> (
    attribute: A,
    defaultValue: S,
    computeVolatile: (value: S, instance?: I) => { [K in A]: S } | undefined
  ) => {
    type InputProps <C extends ComponentType<any>> = {
      Class: C
    } & ReplacedAttributeProps<S, A, ReactComponentProps<C>>
    type ForwardedProps <C extends ComponentType<any>> =
      OptionalVolatileAttributeComponentProps<
        S, C, A, { [K in A]: S }
      >
    return <C extends ComponentType<any>> (
      { Class, [attribute]: volatileOrValue, ...props }:
        // Saves types S and A for later inference in `ExtractReplacedAttribute`
        TypeHolder<S, A, InputProps<C>>
    ) => (
      <OptionalVolatileAttributeComponent
        {...{
          Class,
          volatileAttribute: attribute,
          volatile: volatileOrValue ?? defaultValue,
          computeVolatile,
          ...props
        } as ForwardedProps<C>}
        />
    )
  }
)

/**
 * Returns a component whose `position` attribute can be volatile or static.
 * If static, the property is simply forwarded to the underlying component.
 * If volatile, a `position` property is injected whenever the volatile is ready
 * then directly updated via `position.set`. If not specified, the property is
 * static and has value `[0, 0, 0]`.
 * @param props.Class the component that will receive the position property
 * @param props.position the object's position (optional)
 */
export const VolatilePositionComponent = VolatileAttributeComponentFactory(
  "position",
  [0, 0, 0],
  (position: Position3ValueType, instance?: Positionable) => {
    if (!instance)
      return { position }
    instance.position.copy(Vector3ConstructorExtended.create(position))
  }
)

/**
 * Returns a component whose `scale` attribute can be volatile or static.
 * If static, the property is simply forwarded to the underlying component.
 * If volatile, a `scale` property is injected whenever the volatile is ready
 * then directly updated via `scale.set`. If not specified, the property is
 * static and has value `[1, 1, 1]`.
 * @param props.Class the component that will receive the scale property
 * @param props.scale the object's scale (optional)
 */
export const VolatileScaleComponent = VolatileAttributeComponentFactory(
  "scale",
  [1, 1, 1],
  (scale: Scale3ValueType, instance?: Scalable) => {
    if (!instance)
      return { scale }
    instance.scale.copy(Vector3ConstructorExtended.create(scale))
  }
)

// The volatile property handlers which should come with each `Component`.
const injectedClasses = [
  VolatilePositionComponent,
  VolatileScaleComponent
] as const

type ExtractReplacedAttribute<T, C> =
  T extends { (props: infer P): any }
    ? P extends TypeHolder<infer S, infer A extends string, infer D>
      ? D extends ReplacedAttributeProps<S, A, infer _>
        ? ReplacedAttributeProps<S, A, C>
        : never
      : never
    : never

/**
 * Computes the type of the properties expected by `Component`, without the
 * `Class` property, given an underlying component.
 * @template C the component used in `Component`
 */
export type OuterComponentProps<
  C extends ComponentType<any>,
  M = [...typeof injectedClasses]
> = M extends [infer I, ...infer R]
  ? ExtractReplacedAttribute<I, OuterComponentProps<C, R>>
  : ReactComponentProps<C>

// Represents a component involved in the generic component volatile binding
// chain: an "instance" of a class created through `VolatileComponentFactory`.
type IntermediateComponentTypeProps<C extends ComponentType<any>> = {
  Class: C
} & ReactComponentProps<C>

type IntermediateComponentType = ComponentType<
  IntermediateComponentTypeProps<ComponentType<any>>
>

type MultipleVolatileAttributesComponentProps<
  D extends readonly IntermediateComponentType[],
  C extends ComponentType<any>
> = {
  IntermediateClasses: D
  UserClass: C
} & OuterComponentProps<C>

const MultipleVolatileAttributesComponent = (
  <
    D extends readonly IntermediateComponentType[],
    C extends ComponentType<any>
  > (
    props: MultipleVolatileAttributesComponentProps<D, C>
  ) => {
    type Next<D> = D extends [infer _, ...infer R]? R: never
    const { IntermediateClasses, UserClass, ...otherProps } = props
    const [ CurrentIntermediateClass, ...NextClasses] = IntermediateClasses
    const NextComponent = useMemo(
      () => (
        nextProps: MultipleVolatileAttributesComponentProps<Next<D>, C>
      ) => (
        <MultipleVolatileAttributesComponent<Next<D>, C>
          IntermediateClasses={NextClasses}
          UserClass={UserClass}
          {...nextProps as OuterComponentProps<C, Next<D>>}
          />
      ),
      [...NextClasses, UserClass]
    )
    if (!NextClasses.length)
      return (
        <CurrentIntermediateClass
          Class={UserClass}
          {...otherProps as ReactComponentProps<C>}
          />
      )
    return (
      <CurrentIntermediateClass
        Class={NextComponent}
        {...otherProps as OuterComponentProps<C, Next<D>>}
        />
    )
  }
)

type ComponentProps<C extends ComponentType<any>> = {
  Class: C
} & OuterComponentProps<C>

/**
 * Returns a generic component which can be attributed spatial properties.
 * Static properties are simply forwarded to the underlying component. Volatile
 * properties are injected whenever they are ready for use and automatically
 * updated.
 * 
 * Available properties:
 *  - `position` (see {@link VolatilePositionComponent})
 *  - `scale` (see {@link VolatileScaleComponent})
 * 
 * This component is essentially a wrapper that encapsulates all properties that
 * are related to the placement of an object in space. When a property is not
 * specified, it gets a default value and the associated volatile logic is
 * skipped to reduce overhead. For more information about the default values
 * being used for a property, see the related component.
 * @param props.Class the component that will receive the properties
 * @param props.position the object's position (optional)
 * @param props.scale the object's scale (optional)
 */
export const Component = (
  <C extends ComponentType<any>> ({ Class, ...props }: ComponentProps<C>) => {
    return (
      <MultipleVolatileAttributesComponent<typeof injectedClasses, C>
        IntermediateClasses={injectedClasses}
        UserClass={Class}
        {...props as OuterComponentProps<C>}
        />
    )
  }
)
