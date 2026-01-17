import { RefObject, useEffect } from "react"
import { Box2, Camera, Mesh, Object3D, Vector2, Vector3 } from "three"

import { useDerivatedVolatile, RootVolatile } from "../motion/Volatile"
import { Volatile } from "../motion/Volatile"
import { useLayerStack } from "../components/rendering/LayerStack"
import { useRenderer } from "../components/rendering/Renderer"


const keep_min = (a: Vector2, b: Vector3) => {
  if (a.x > b.x) a.x = b.x;
  if (a.y > b.y) a.y = b.y;
}

const keep_max = (a: Vector2, b: Vector3) => {
  if (a.x < b.x) a.x = b.x;
  if (a.y < b.y) a.y = b.y;
}

const computeBoundingBox = (object: Object3D, camera: Camera) => {
  let min = undefined;
  let max = undefined;

  object.updateMatrixWorld()
  
  if (!object.visible)
    return new Box2(min, max)

  if (object instanceof Mesh && object.geometry !== undefined) {
    const vertices = object.geometry.vertices
    if (
      vertices === undefined
      && object.geometry.attributes !== undefined
      && "position" in object.geometry.attributes
    ) {
      // Buffered geometry
      const vertex = new Vector3()
      const pos = object.geometry.attributes.position;
      for (let i = 0; i < pos.count * pos.itemSize; i += pos.itemSize) {
        vertex.set(pos.array[i], pos.array[i + 1], pos.array[i + 2])
        const vertexWorldCoord = vertex.applyMatrix4(object.matrixWorld)
        const vertexScreenSpace = vertexWorldCoord.project(camera)

        if (min === undefined)
          min = new Vector2(vertexScreenSpace.x, vertexScreenSpace.y)
        else
          keep_min(min, vertexScreenSpace);
    
        if (max === undefined)
          max = new Vector2(vertexScreenSpace.x, vertexScreenSpace.y)
        else
          keep_max(max, vertexScreenSpace)
      }
    } else {
      // Regular geometry
      const vertex = new Vector3();
      for (let i = 0; i < vertices.length; ++i) {
        const vertexWorldCoord =
          vertex.copy(vertices[i]).applyMatrix4(object.matrixWorld)
        const vertexScreenSpace = vertexWorldCoord.project(camera)

        if (min === undefined)
          min = new Vector2(vertexScreenSpace.x, vertexScreenSpace.y)
        else
          keep_min(min, vertexScreenSpace)
    
        if (max === undefined)
          max = new Vector2(vertexScreenSpace.x, vertexScreenSpace.y)
        else
          keep_max(max, vertexScreenSpace)
      }
    }
  }

  return new Box2(min, max)
}

const defaultBox = new Box2()

/**
 * Represents the 2D bounding box of an object.
 */
export class BoundingBox {
  defined: boolean
  box: Box2

  constructor(box?: Box2) {
    this.defined = !!box && !(
      !isFinite(box.min.x)
      || !isFinite(box.max.x)
      || !isFinite(box.min.y)
      || !isFinite(box.max.y)
    )
    this.box = box? box: defaultBox
  }

  /**
   * Returns the bottom left vertex.
   */
  get min() {
    return this.box.min
  }

  /**
   * Returns the top right vertex.
   */
  get max() {
    return this.box.max
  }
}

let targets = new Map()

/**
 * Hook that registers an object for bounding box computation.
 * @param ref the ref of the object to compute the bounding box of
 */
export const useRegisteredBoundingBox = (ref: RefObject<Object3D | null>) => {
  const { beforeRenderSignal } = useRenderer()
  const { getMainCamera } = useLayerStack()
  const boundingBox = useDerivatedVolatile(beforeRenderSignal, (_) => {
    const mainCamera = getMainCamera()
    if (ref.current && mainCamera)
      // TODO: evaluate how we could use the object's layer camera instead -
      // this would enable tracking of UI elements or other upper layer objects
      return new BoundingBox(computeBoundingBox(ref.current, mainCamera))
  }, [getMainCamera])

  useEffect(() => {
    targets.set(ref.current, boundingBox)
    return () => void targets.delete(ref.current)
  }, [])
}

const DEFAULT_BOUNDING_BOX = new RootVolatile(new BoundingBox())

/**
 * Hook that returns the bounding box of an object.
 * @param ref the ref of the object to get the bounding box from
 * @returns a volatile holding the bounding box of the object
 */
export const useBoundingBox =
  (ref: RefObject<Object3D>): Volatile<BoundingBox> =>
    useDerivatedVolatile(
      // TODO: get rid of the default bounding box
      targets.get(ref.current) || DEFAULT_BOUNDING_BOX,
      (boundingBox: BoundingBox) => boundingBox
    )
