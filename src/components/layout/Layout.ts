import { createContext, useId, useEffect, useContext } from "react"

import { useVolatile, Volatile } from "../../motion/Volatile"
import { SizeValueType } from "../../types/Space2d"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { ThreeVector3 } from "../../primitives/Vector3"
import { ThreeVector2 } from "../../primitives/Vector2"


type ComponentIdType = ReturnType<typeof useId>

interface LayoutInterface {
  register (
    id: ComponentIdType,
    size: SizeValueType | Volatile<SizeValueType>,
    target: Volatile<ThreeVector2>,
    snap: boolean
  ): void
  unregister (id: ComponentIdType): void,
  bindPosition (
    id: ComponentIdType,
    position: Volatile<ThreeVector2>
  ): () => void
}

/**
 * Layout context used by clients to request positioning. Managers must
 * implement the {@link LayoutInterface} interface.
 */
export const LayoutContext = createContext<LayoutInterface>(
  NotImplementedProxy("Layout context is not available") as LayoutInterface
)

/**
 * Returns a volatile 3D position computed by the current layout manager. If
 * `enabled` is `false`, the volatile takes the value of `target`.
 * @param size the size of the block to place
 * @param target the preferred position of the block
 * @param enabled `true` if the manager should place the block
 * @returns a volatile 3D position
 */
export const usePosition = (
  size: SizeValueType | Volatile<SizeValueType>,
  target: Volatile<ThreeVector2>,
  enabled: boolean
): Volatile<ThreeVector3> => {
  const id = useId()
  const position = useVolatile<ThreeVector3>()
  const { register, unregister, bindPosition } = useContext(LayoutContext)
  useEffect(
    () => void register(id, size, target, enabled),
    [size, target, enabled]
  )
  useEffect(() => () => unregister(id), [])
  useEffect(() => bindPosition(id, position), [bindPosition, position])
  return position
}
