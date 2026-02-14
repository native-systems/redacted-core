import { createContext, useId, useEffect, useContext } from "react"
import { Vector2, Vector3 } from "three"

import { PotentialVolatile, Volatile } from "../../motion/Volatile"
import { SizeValueType } from "../../primitives/ValueTypes"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { useVolatileVector2Size } from "../../primitives/Normalizers"


type ComponentIdType = ReturnType<typeof useId>

interface LayoutInterface {
  register (id: ComponentIdType): Volatile<Vector3>
  update (
    id: ComponentIdType,
    size: Volatile<Vector2>,
    target: Volatile<Vector2>,
    snap: boolean
  ): void
  unregister (id: ComponentIdType): void
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
  size: PotentialVolatile<SizeValueType>,
  target: Volatile<Vector2>,
  enabled: boolean
): Volatile<Vector3> => {
  const { register, unregister, update } = useContext(LayoutContext)
  const id = useId()
  const position = register(id)
  const volatileSize = useVolatileVector2Size(size)
  useEffect(
    () => void update(id, volatileSize, target, enabled),
    [update, size, target, enabled]
  )
  useEffect(() => () => unregister(id), [])
  return position
}
