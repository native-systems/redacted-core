import React, { createContext, forwardRef, ReactNode, RefObject, useCallback,
  useContext, useId, useImperativeHandle, useMemo, useRef } from "react"
import { Size, useThree, Canvas } from "@react-three/fiber"
import { Box2, Camera, Matrix3, Scene, Vector2, Vector4, WebGLRenderer }
  from "three"

import { RegisterLayer } from "./Layer"
import { ComponentVolatileRegistry } from "../../motion/Component"
import { useVolatile, Volatile } from "../../motion/Volatile"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { initializeRenderSteps, newRenderStepIdentifier,
  RenderStepIdentifierType, UserInterfaceStage } from "./Stages"
import { PartiallyOrderedSet } from "../../utils/PartiallyOrderedSet"
import { error } from "../../logging/Log"
import { inspectRoot } from "../../utils/Debug"
import { useCommonMaterialValues } from "../../material/CommonMaterialValues"


const viewToSubviewMatrix = (view: Box2, subview: Box2) => {
  const sx = (subview.max.x - subview.min.x) / (view.max.x - view.min.x)
  const sy = (subview.max.y - subview.min.y) / (view.max.y - view.min.y)
  const tx = subview.min.x - view.min.x * sx
  const ty = subview.min.y - view.min.y * sy
  return new Matrix3(
    sx, 0, tx,
    0, sy, ty,
    0, 0, 1
  )
}

// Sets up the viewport and shader uniforms to enable a full render of the scene
// in a subrectangle of the output canvas. Can be called recursively.
const executeInSubview = (
  gl: WebGLRenderer,
  physicalSubviewMatrix: Matrix3,
  screenBounds: Box2,
  localSubview: Box2,
  callback: () => void
) => {
  const dpr = gl.getPixelRatio()
  localSubview.min.multiplyScalar(dpr)
  localSubview.max.multiplyScalar(dpr)
  const savedSubviewMatrix = physicalSubviewMatrix.clone()
  physicalSubviewMatrix.multiply(
    viewToSubviewMatrix(screenBounds, localSubview)
  )
  screenBounds.min.applyMatrix3(physicalSubviewMatrix)
  screenBounds.max.applyMatrix3(physicalSubviewMatrix)
  const subview = new Vector4(
    screenBounds.min.x / dpr,
    screenBounds.min.y / dpr,
    (screenBounds.max.x - screenBounds.min.x) / dpr,
    (screenBounds.max.y - screenBounds.min.y) / dpr
  )
  const savedViewport = new Vector4()
  gl.getViewport(savedViewport)
  gl.setViewport(subview)
  gl.setScissor(subview)
  gl.setScissorTest(true)
  callback()
  gl.setScissorTest(false)
  gl.setViewport(savedViewport)
  physicalSubviewMatrix.copy(savedSubviewMatrix)
}

type ComponentIdType = ReturnType<typeof useId>

type RenderOptions = {
  disableClear?: boolean
  renderedComponents?: { [id: ComponentIdType]: number }
}

const renderLayer = (
  clear: boolean,
  scene: Scene,
  camera: Camera,
  gl: WebGLRenderer,
  options: RenderOptions = {}
) => {
  const { disableClear } = options
  gl.autoClear = clear && !disableClear
  gl.clearDepth()
  gl.render(scene, camera)
}

const registerVolatile = (
  registry: PartiallyOrderedSet<Volatile<any>>,
  counters: Map<Volatile<any>, number>,
  volatile: Volatile<any>
) => {
  registry.add(volatile)
  counters.set(volatile, (counters.get(volatile) ?? 0) + 1)
  volatile.getAuxiliaries().forEach((auxiliary) => {
    registerVolatile(registry, counters, auxiliary)
    registry.order(auxiliary, volatile)
  })
}

const unregisterVolatile = (
  registry: PartiallyOrderedSet<Volatile<any>>,
  counters: Map<Volatile<any>, number>,
  volatile: Volatile<any>
) => {
  volatile.getAuxiliaries().forEach(
    (auxiliary) => unregisterVolatile(registry, counters, auxiliary)
  )
  const counter = counters.get(volatile)!
  if (counter == 1)
    return void registry.delete(volatile)
  counters.set(volatile, counter - 1)
}

type RenderRoutine = (options: RenderOptions) => void

const updateSortedRenderSteps = (
  renderStepIdentifiers: PartiallyOrderedSet<RenderStepIdentifierType>,
  renderSteps: Map<RenderStepIdentifierType, RenderRoutine>
) => {
  const sorted = []
  for (const identifier of renderStepIdentifiers.sortedValues())
    if (renderSteps.has(identifier))
      sorted.push(renderSteps.get(identifier)!)
  return sorted
}

const registerRenderStep = (
  renderStepIdentifiers: PartiallyOrderedSet<RenderStepIdentifierType>,
  renderSteps: Map<RenderStepIdentifierType, RenderRoutine>,
  sortedRenderStepsRef: RefObject<RenderRoutine[]>,
  identifier: RenderStepIdentifierType,
  after: Iterable<RenderStepIdentifierType>,
  before: Iterable<RenderStepIdentifierType>,
  render: RenderRoutine
) => {
  renderSteps.set(identifier, render)
  renderStepIdentifiers.add(identifier)
  for (const afterRenderStepIdentifier of after)
    if (!renderStepIdentifiers.order(afterRenderStepIdentifier, identifier)) {
      error("Render step ordering failed")
      inspectRoot().Renderer_registerRenderSteps = {
        renderStepIdentifiers,
        identifier,
        after
      }
    }
  for (const beforeRenderStepIdentifier of before)
    if (!renderStepIdentifiers.order(identifier, beforeRenderStepIdentifier)) {
      error("Render step ordering failed")
      inspectRoot().Renderer_registerRenderSteps = {
        renderStepIdentifiers,
        identifier,
        before
      }
    }
  sortedRenderStepsRef.current = updateSortedRenderSteps(
    renderStepIdentifiers,
    renderSteps
  )
  return () => {
    renderStepIdentifiers.delete(identifier)
    renderSteps.delete(identifier)
    sortedRenderStepsRef.current = updateSortedRenderSteps(
      renderStepIdentifiers,
      renderSteps
    )
  }
}

type Unregister = () => void

export interface RendererInterface {
  size: Size
  bounds: Box2
  beforeRenderSignal: Volatile<number>
  getPixelRatio (): number
  invalidate (): void
  attachOnInvalidate (handler: () => void): Unregister
  registerLayer (
    identifier: RenderStepIdentifierType,
    after: Iterable<RenderStepIdentifierType>,
    before: Iterable<RenderStepIdentifierType>,
    clear: boolean,
    scene: Scene,
    camera: Camera
  ): Unregister
  registerRenderer (
    identifier: RenderStepIdentifierType,
    after: Iterable<RenderStepIdentifierType>,
    before: Iterable<RenderStepIdentifierType>,
    renderer: RenderRoutine
  ): Unregister
  resolveComponentVolatiles (): void
  subview (bounds: Box2, callback: () => void): void
  render (options?: RenderOptions): void
}

const RendererContext = createContext<RendererInterface>(
  NotImplementedProxy("Renderer context is not available") as RendererInterface
)

/**
 * Hook that returns the current renderer interface. Clients can use this object
 * to retrieve the renderer size, request an invalidation or register custom
 * layers and renderers.
 * @returns the current renderer interface
 */
export const useRenderer = () => useContext(RendererContext)

/**
 * Global renderer. Exposes a {@link RendererInterface.render} function which
 * renders `children` in the current {@link Canvas}.
 */
export const Renderer = forwardRef(
  ({ children }: { children: ReactNode }, ref) => {
    // TODO: investigate the possibility of splitting this component in two
    // parts: a global renderer exposing the `three` interface and a generic
    // nestable one.
    const gl = useThree(state => state.gl)
    const size = useThree(state => state.size)
    const { physicalSubviewMatrix } = useCommonMaterialValues()
    const bounds = useMemo(
      () => {
        const viewport = new Vector4()
        const dpr = gl.getPixelRatio()
        gl.getViewport(viewport)
        return new Box2(
          new Vector2(viewport.x * dpr, viewport.y * dpr),
          new Vector2(viewport.z * dpr, viewport.w * dpr)
        )
      },
      [size]
    )
    const volatileRegistry = useMemo(
      () => new PartiallyOrderedSet<Volatile<any>>(),
      []
    )
    const volatileRegistryCounters = useMemo(
      () => new Map<Volatile<any>, number>(),
      []
    )
    const sortedVolatiles = useRef<Volatile<any>[]>(null)
    const renderStepIdentifiers = useMemo(() => initializeRenderSteps(), [])
    const renderSteps = useMemo(
      () => new Map<RenderStepIdentifierType, RenderRoutine>(),
      []
    )
    const sortedRenderStepsRef = useRef<RenderRoutine[]>([])
    const symbolResolutionInProgress = useRef(false)
    const beforeRenderSignal = useVolatile(1)
    const onInvalidateHandlers = useMemo(() => new Set<() => void>(), [])

    const invalidate = useCallback(
      () => onInvalidateHandlers.forEach(handler => handler()),
      []
    )

    const registerComponentVolatile = useCallback((volatile: Volatile<any>) => {
      registerVolatile(volatileRegistry, volatileRegistryCounters, volatile)
      sortedVolatiles.current = null
      return () => {
        unregisterVolatile(volatileRegistry, volatileRegistryCounters, volatile)
      }
    }, [volatileRegistry])

    const firstLayerIdentifier = useMemo(() => newRenderStepIdentifier(), [])

    const rendererInterface: RendererInterface = useMemo(() => ({
      size: size,
      bounds: bounds,
      beforeRenderSignal,
      invalidate,
      getPixelRatio () {
        return gl.getPixelRatio()
      },
      attachOnInvalidate (handler) {
        if (handler == invalidate)
          return () => undefined
        onInvalidateHandlers.add(handler)
        return () => void onInvalidateHandlers.delete(handler)
      },
      registerLayer: (identifier, after, before, clear, scene, camera) =>
        registerRenderStep(
          renderStepIdentifiers,
          renderSteps,
          sortedRenderStepsRef,
          identifier,
          after,
          before,
          options => renderLayer(clear, scene, camera, gl, options)
        ),
      registerRenderer: (identifier, after, before, renderer) =>
        registerRenderStep(
          renderStepIdentifiers,
          renderSteps,
          sortedRenderStepsRef,
          identifier,
          after,
          before,
          options => renderer(options)
        ),
      resolveComponentVolatiles () {
        // We need to check whether we're already in the context of a symbol
        // resolution - this can happen if the scene is being rendered into
        // itself using a resolver symbol in the registry.
        if (symbolResolutionInProgress.current)
          return
        symbolResolutionInProgress.current = true
        beforeRenderSignal.set(1)
        if (!sortedVolatiles.current)
          sortedVolatiles.current = [...volatileRegistry.sortedValues()]
        sortedVolatiles.current.forEach((volatile) => volatile.current())
        symbolResolutionInProgress.current = false
      },
      subview (viewBounds: Box2, callback: () => void) {
        executeInSubview(
          gl,
          physicalSubviewMatrix,
          bounds.clone(),
          viewBounds.clone(),
          callback
        )
      },
      render (options = {}) {
        sortedRenderStepsRef.current.forEach((render) => render(options))
      }
    }), [
      gl,
      size,
      physicalSubviewMatrix,
      bounds,
      beforeRenderSignal,
      renderStepIdentifiers,
      renderSteps
    ])

    useImperativeHandle(ref, () => rendererInterface, [rendererInterface])

    return (
      <RendererContext.Provider value={rendererInterface}>
        <ComponentVolatileRegistry register={registerComponentVolatile}>
          {children}
        </ComponentVolatileRegistry>
        <RegisterLayer
          clear={true}
          identifier={firstLayerIdentifier}
          before={[UserInterfaceStage.start]}
          />
      </RendererContext.Provider>
    )
  }
)
