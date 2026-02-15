import { Vector3 } from "three"

import { SizeValueType } from "../primitives/ValueTypes"
import { useDerivatedVolatile, PotentialVolatile, Volatile }
  from "../motion/Volatile"
import { useVolatileVector2Size } from "../primitives/Normalizers"


/**
 * Converts a 2D size object to a 3D scale.
 * @param size a volatile {@link SizeValueType}
 * @returns a volatile `[width, height, 1]`
 */
export const use3DScaleFromSize = 
  (size: PotentialVolatile<SizeValueType>): Volatile<Vector3> =>
    useDerivatedVolatile(
      useVolatileVector2Size(size),
      (value) => new Vector3(value.x, value.y, 1),
    )
