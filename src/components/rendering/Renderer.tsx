import React, { createContext, forwardRef, ReactNode, RefObject, useCallback,
  useContext, useId, useImperativeHandle, useMemo, useRef } from "react"
import { Size, useThree, Canvas } from "@react-three/fiber"
import { Camera, Scene, Vector4, WebGLRenderer } from "three"

import { RegisterLayer } from "./Layer"
import { ComponentVolatileRegistry } from "../../motion/Component"
import { useVolatile, Volatile } from "../../motion/Volatile"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { ThreeBox2 } from "../../primitives/Box2"
import { initializeRenderSteps, newRenderStepIdentifier,
  RenderStepIdentifierType, UserInterfaceStage } from "./Stages"
import { PartiallyOrderedSet } from "../../utils/PartiallyOrderedSet"
import { error } from "../../logging/Log"
import { inspectRoot } from "../../utils/Debug"


type ComponentIdType = ReturnType<typeof useId>

let viewport = new Vector4()

const renderWithBounds = (
  gl: WebGLRenderer,
  bounds: ThreeBox2 | undefined,
  callback: () => void
) => {
  gl.getViewport(viewport)
  // TODO: change the logic to allow a renderer to set bounds when entering or
  // exiting a rendering context instead of setting them with each render
  if (bounds) {
    const x = bounds.min.x
    const y = bounds.min.y
    const width = bounds.max.x - x
    const height = bounds.max.y - y
    gl.setViewport(x, y, width, height)
    gl.setScissor(x, y, width, height) 
    gl.setScissorTest(true)
  }
  callback()
  if (bounds) {
    gl.setScissorTest(false)
    gl.setViewport(viewport)
  }
}

type RenderOptions = {
  bounds?: ThreeBox2
  renderedComponents?: { [id: ComponentIdType]: boolean }
}

const renderLayer = (
  clear: boolean,
  scene: Scene,
  camera: Camera,
  gl: WebGLRenderer,
  options: RenderOptions = {}
) => {
  const { bounds } = options

  renderWithBounds(gl, bounds, () => {
    gl.autoClear = clear && !bounds
    gl.clearDepth()
    gl.render(scene, camera)
  })
}

type RenderRoutine = (options: RenderOptions) => void

const registerRenderStep = (
  renderSteps: PartiallyOrderedSet<RenderRoutine, symbol>,
  sortedRenderStepsRef: RefObject<RenderRoutine[]>,
  identifier: RenderStepIdentifierType,
  after: Iterable<RenderStepIdentifierType>,
  before: Iterable<RenderStepIdentifierType>,
  render: RenderRoutine
) => {
  renderSteps.add(render)
  renderSteps.addKey(identifier)
  renderSteps.bindKey(render, identifier)
  for (const afterRenderStepIdentifier of after)
    if (!renderSteps.order(afterRenderStepIdentifier, identifier)) {
      error("Render step ordering failed")
      inspectRoot().Renderer_registerRenderSteps = {
        renderSteps,
        identifier,
        after
      }
    }
  for (const beforeRenderStepIdentifier of before)
    if (!renderSteps.order(identifier, beforeRenderStepIdentifier)) {
      error("Render step ordering failed")
      inspectRoot().Renderer_registerRenderSteps = {
        renderSteps,
        identifier,
        before
      }
    }
  sortedRenderStepsRef.current = [...renderSteps.sortedValues()]
  return () => {
    renderSteps.removeKey(identifier)
    renderSteps.delete(render)
    sortedRenderStepsRef.current = [...renderSteps.sortedValues()]
  }
}

type Unregister = () => void

export interface RendererInterface {
  size: Size
  beforeRenderSignal: Volatile<number>
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
    const componentVolatileRegistry = useMemo(
      () => new Set<Volatile<any>>(),
      []
    )
    const renderSteps = useMemo(
      () => initializeRenderSteps<RenderRoutine>(),
      []
    )
    const sortedRenderStepsRef = useRef<RenderRoutine[]>([])
    const beforeRenderSignal = useVolatile(1)
    const onInvalidateHandlers = useMemo(() => new Set<() => void>(), [])

    const invalidate = useCallback(
      () => onInvalidateHandlers.forEach(handler => handler()),
      []
    )

    const registerComponentVolatile = useCallback((volatile: Volatile<any>) => {
      componentVolatileRegistry.add(volatile)
      return () => componentVolatileRegistry.delete(volatile)
    }, [componentVolatileRegistry])

    const firstLayerIdentifier = useMemo(() => newRenderStepIdentifier(), [])

    let symbolResolutionInProgress = false

    const rendererInterface: RendererInterface = useMemo(() => ({
      size: size,
      beforeRenderSignal,
      invalidate,
      attachOnInvalidate (handler) {
        if (handler == invalidate)
          return () => undefined
        onInvalidateHandlers.add(handler)
        return () => void onInvalidateHandlers.delete(handler)
      },
      registerLayer: (identifier, after, before, clear, scene, camera) =>
        registerRenderStep(
          renderSteps,
          sortedRenderStepsRef,
          identifier,
          after,
          before,
          options => renderLayer(clear, scene, camera, gl, options)
        ),
      registerRenderer: (identifier, after, before, renderer) =>
        registerRenderStep(
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
        if (symbolResolutionInProgress)
          return
        symbolResolutionInProgress = true
        beforeRenderSignal.set(1)
        componentVolatileRegistry.forEach(volatile => volatile.current())
        symbolResolutionInProgress = false
      },
      render (options = {}) {
        sortedRenderStepsRef.current.forEach((render) => render(options))
      }
    }), [size, beforeRenderSignal, renderSteps, gl])

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
