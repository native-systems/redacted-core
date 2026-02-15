import React, { useEffect, useId, useMemo, useRef } from "react"
import { Box2, Vector2 } from "three"

import { RendererInterface, useRenderer } from "../rendering/Renderer"
import { LocalLayoutClient, useComputedBounds, useLocalLayoutSettings }
  from "../layout/LocalLayout"
import { Resolve } from "../../motion/Component"
import { get, useDerivatedVolatile, useVolatile, Volatile }
  from "../../motion/Volatile"
import { newRenderStepIdentifier, SubviewStage } from "../rendering/Stages"
import { useLayer } from "../rendering/Layer"


const MAX_RENDERS_PER_COMPONENT = 3

type MiniViewImplProps = {
  renderer: RendererInterface
  width: number
  height: number
}

const MiniViewImpl = ({ renderer, width, height }: MiniViewImplProps) => {
  const { invalidate, registerRenderer, beforeRenderSignal } = useRenderer()
  const { transform: { toScaled } } = useLayer()
  const bounds = useLocalLayoutSettings()
  const computedBounds = useComputedBounds()
  const id = useId()
  const renderStepIdentifier = useMemo(() => newRenderStepIdentifier(), [])
  const rendered = useRef(false)

  const innerBounds: Volatile<Box2> = useDerivatedVolatile(
    useVolatile(computedBounds), 
    ({ min, max }) => new Box2(
      toScaled(new Vector2(min.x + 1, min.y + 1)),
      toScaled(new Vector2(max.x - 1, max.y - 1))
    )
  )

  const resolver = useDerivatedVolatile(
    beforeRenderSignal,
    () => {
      // TODO: verify that the mesh's onBeforeRender routine is executed before
      // this symbol is resolved
      if (rendered)
        renderer.resolveComponentVolatiles()
    }
  )

  useEffect(() => {
    // Forwards invalidation requests to the parent renderer
    const detachOnInvalidate = renderer.attachOnInvalidate(invalidate)
    const unregisterRenderer = registerRenderer(
      renderStepIdentifier,
      [SubviewStage.start],
      [SubviewStage.end],
      (options) => {
        // Skip rendering if the subview is not visible (outside the frustrum)
        if (!rendered)
          return
        const bounds = get(innerBounds, null)
        if (!bounds)
          return
        const { renderedComponents = {} } = options
        if ((renderedComponents[id] ?? 0) >= MAX_RENDERS_PER_COMPONENT)
          return
        renderer.subview(bounds, () => {
          renderer.render({
            disableClear: true,
            ...options,
            renderedComponents: {
              ...renderedComponents,
              [id]: (renderedComponents[id] ?? 0) + 1
            }
          })
        })
        rendered.current = false
      }
    )
    return () => {
      unregisterRenderer()
      detachOnInvalidate()
    }
  }, [registerRenderer, renderStepIdentifier, renderer, id, bounds, height])

  return (
    <>
      <Resolve volatile={resolver} />
      <Resolve volatile={innerBounds} />
      <mesh onBeforeRender={() => rendered.current = true}
        position={[1, 1, 0]}
        scale={[width, height, 1]}
        visible={true}
        >
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  )
}

type MiniViewProps = {
  renderer: RendererInterface
  width?: number
  height?: number
}

/**
 * Invokes a renderer in a nested view using the local layout settings. A
 * renderer can be nested into itself, but it won't be invoked more than one
 * additional time to prevent Larsen effect. If a width is not specified, it
 * will default to the local layout `maxInnerWidth`. If a height is not
 * specified, it will be computed from the width and nested view aspect ratio.
 * @param props.renderer the renderer to invoke
 * @param props.width an optional width
 * @param props.height an optional height
 */
export const MiniView = (
  { renderer, width, height }: MiniViewProps
) => {
  const bounds = useLocalLayoutSettings()

  const computedWidth = width ?? bounds.maxOuterWidth ?? Infinity
  const computedHeight = height ??
    computedWidth / renderer.size.width * renderer.size.height

  if (!isFinite(computedWidth))
    throw new Error("Local layout doesn't specify a maxInnerWidth")

  return (
    <LocalLayoutClient>
      <MiniViewImpl
        renderer={renderer}
        width={computedWidth - 2}
        height={computedHeight - 2}
        />
    </LocalLayoutClient>
  )
}
