import { SizeValueType } from "../types/Space2d"
import { useDerivatedVolatile, Volatile } from "../motion/Volatile"


/**
 * Converts a 2D size object to a 3D scale.
 * @param size a volatile {@link SizeValueType} pair
 * @returns a volatile `[width, height, 1]`
 */
export const use3DScale = 
  (size: Volatile<SizeValueType>): Volatile<[number, number, number]> =>
    useDerivatedVolatile(
      size,
      ([width, height]) => [width, height, 1],
    )
