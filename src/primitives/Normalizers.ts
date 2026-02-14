import { Vector2 } from "three"

import { PotentialVolatile, useDerivatedVolatile, useVolatile, Volatile }
  from "../motion/Volatile"
import { Vector2ConstructorExtended } from "./Constructors"
import { SizeValueType } from "./ValueTypes"


/**
 * Hook which promotes a volatile or static size representation to a volatile
 * {@link Vector2}.
 * @param size the volatile or static size representation
 * @returns a {@link Vector2}
 */
export const useVolatileVector2Size = (
  size: PotentialVolatile<SizeValueType>
): Volatile<Vector2> => (
  useDerivatedVolatile(
    useVolatile(size),
    (value) => Vector2ConstructorExtended.create(value)
  )
)
