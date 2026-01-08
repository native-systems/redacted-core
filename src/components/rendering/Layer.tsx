import React, { createContext, ReactNode, useContext, useEffect, useMemo }
  from "react"
import { createPortal, useThree } from "@react-three/fiber"
import { Scene } from "three"

import { useRenderer } from "./Renderer"
import { Vector2 } from "../../primitives/Vector2"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"


interface LayerTransformInterface {
  /**
   * Maps a normalized 2D vector to the same vector in this layer's space.
   * @param vector a `[-1, 1] x [-1, 1]` normalized vector
   */
  fromNormalized (vector: Vector2): Vector2
  /**
   * Maps a 2D vector in this layer's space to the same normalized vector.
   * @param vector a vector to be converted to `[-1, 1] x [-1, 1]` space.
   */
  toNormalized (vector: Vector2): Vector2
  /**
   * Maps an unscaled vector in this layer's space to the same scaled one.
   * @param vector an unscaled vector
   */
  fromUnscaled (vector: Vector2): Vector2
  /**
   * Maps a scaled vector in this layer's space to the same unscaled one.
   * @param vector a scaled vector
   */
  toScaled (vector: Vector2): Vector2
}

interface LayerInterface {
  transform: LayerTransformInterface
}

const LayerContext = createContext<LayerInterface>(
  NotImplementedProxy("Layer context is not available") as LayerInterface
)

/**
 * Hook which returns an object containing information and function specific
 * to the current layer, like the transform functions.
 * @returns the current layer interface
 */
export const useLayer = () => useContext(LayerContext)

/**
 * Registers a layer for rendering. Binds the current react-three-fiber scene
 * and camera to the current renderer.
 * @param props.renderPriority the render priority
 */
export const RegisterLayer = (
  { renderPriority }: { renderPriority: number }
) => {
  const { registerLayer } = useRenderer()
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)

  useEffect(() => {
    const unregister = registerLayer(renderPriority, scene, camera)
    return () => unregister()
  }, [scene, camera, renderPriority, registerLayer])

  return <group onPointerOver={() => null} />
}

type LayerProps = {
  renderPriority: number
  transform: LayerTransformInterface
  children: ReactNode
}

/**
 * Declares a render layer. Children of this component will be mounted in their
 * own react-three-fiber scene. The layer is automatically registered in the
 * current renderer.
 * @param props.renderPriority the layer render priority
 * @param props.transform the transform functions
 */
export const Layer = ({ renderPriority, transform, children }: LayerProps) => {
  const scene = useMemo(() => new Scene(), [])

  return createPortal(
    <LayerContext.Provider value={{transform}}>
      {children}
      <RegisterLayer renderPriority={renderPriority} />
    </LayerContext.Provider>,
    scene
  )
}
