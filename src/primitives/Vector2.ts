import { Vector2 as ThreeVector2 } from "three"
import { OverloadedConstructorSingleParameterType }
  from "../utils/OverloadedConstructorSingleParameterType"


type Any = "_vector2_any_constructor_single_parameter_type"

export { ThreeVector2 }

// TODO: verify the relevance of this thing
/**
 * {@link ThreeVector2 THREE.Vector2} with additional constructors.
 */
export class Vector2 extends ThreeVector2 {
  /**
   * Creates a {@link Vector2} from a value of any single parameter type 
   * accepted by the constructor.
   * @param value an initializer value (default `0`)
   * @returns a new {@link Vector2} instance
   */
  static create (value: Vector2ConstructorSingleParameterTypes = 0) {
    return new Vector2(value as unknown as Any)
  }

  /**
   * Constructs a Vector2 from another vector.
   * @param vector the vector to copy
   */
  constructor(vector: ThreeVector2 | Readonly<ThreeVector2>)

  /**
   * Constructs a Vector2 from a single number.
   * @param n the value that each coordinate will be set to
   */
  constructor(n: number)

  /**
   * Constructs a Vector2 from its coordinates.
   * @param x the X coordinate
   * @param y the Y coordinate
   */
  constructor(x: number, y: number)

  /**
   * Constructs a Vector2 from a tuple.
   * @param xyz the tuple [X, Y, Z]
   */
  constructor(
    xy: 
      [x: number, y: number]
      | readonly [x: number, y: number]
  )

  /**
   * Used internally.
   */
  constructor(value: Any)

  constructor(value: any, y?: number, z?: number) {
    if (value instanceof ThreeVector2)
      super(value.x, value.y)
    else if (Array.isArray(value))
      super(...value)
    else if (typeof value === "number" && typeof y === "number")
      super(value, y)
    else
      super(value, value)
  }
}

export type Vector2ConstructorSingleParameterTypes =
  Exclude<OverloadedConstructorSingleParameterType<typeof Vector2>, Any>
