import React, { RefObject, useEffect, useId, useRef } from "react"

import { RendererInterface, useRenderer } from "../rendering/Renderer"
import { LocalLayoutClient, LocalLayoutClientContainer, useLocalLayoutSettings }
  from "../layout/LocalLayout"
import { Resolve } from "../../motion/Component"
import { useDerivatedVolatile } from "../../motion/Volatile"


type MiniViewImplProps = {
  containerRef: RefObject<LocalLayoutClientContainer | null>
  renderer: RendererInterface
  height: number
}

const MiniViewImpl = (
  { containerRef, renderer, height }: MiniViewImplProps
) => {
  const { invalidate, registerRenderer, beforeRenderSignal } = useRenderer()
  const bounds = useLocalLayoutSettings()
  const id = useId()

  // This resolver symbol is used to bind the parent renderer pre-rendering step
  // to the child's renderer.
  const resolver = useDerivatedVolatile(
    beforeRenderSignal,
    () => renderer.resolveComponentVolatiles()
  )

  useEffect(() => {
    // Forwards invalidation requests to the parent renderer
    const detachOnInvalidate = renderer.attachOnInvalidate(invalidate)
    const unregisterRenderer = registerRenderer(5, (options) => {
      if (!containerRef.current)
        return
      const bounds = containerRef.current.getBounds()
      if (!bounds)
        return
      const { renderedComponents = {} } = options
      if (id in renderedComponents)
        return
      return renderer.render({
        bounds: containerRef.current.getBounds(),
        ...options,
        renderedComponents: { ...renderedComponents, [id]: true }
      })
    })
    return () => {
      unregisterRenderer()
      detachOnInvalidate()
    }
  }, [registerRenderer, renderer, id, bounds, height])

  return <Resolve volatile={resolver} />
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
  const containerRef = useRef<LocalLayoutClientContainer>(null)

  const computedWidth = width ?? bounds.maxInnerWidth ?? Infinity
  const computedHeight = height ??
    computedWidth / renderer.size.width * renderer.size.height - 2
  
  if (!isFinite(computedWidth))
    throw new Error("Local layout doesn't specify a maxInnerWidth")

  return (
    <LocalLayoutClient
      ref={containerRef}
      height={height}
      width={bounds.maxInnerWidth}
      >
      <MiniViewImpl
        containerRef={containerRef}
        renderer={renderer}
        height={computedHeight}
        />
    </LocalLayoutClient>
  )
}
