import { Vector2, Vector3 } from "three"

import { OverloadedConstructorSingleParameterTypes }
  from "../utils/OverloadedConstructorSingleParameterTypes"


type Any = "_any_constructor_single_parameter_type"

/**
 * Additional constructors for {@link Vector2}.
 */
export class Vector2ConstructorExtended extends Vector2 {
  /**
   * Creates a {@link Vector2} from a value of any single parameter type 
   * accepted by the constructor.
   * @param value an initializer value (default `0`)
   * @returns a new {@link Vector2} instance
   */
  static create (value: Vector2ConstructorSingleParameterTypes = 0) {
    return new Vector2ConstructorExtended(value as unknown as Any)
  }

  /**
   * Constructs a Vector2 from another vector.
   * @param vector the vector to copy
   */
  constructor (vector: Readonly<Vector2>)

  /**
   * Constructs a Vector2 from a single number.
   * @param n the value that each coordinate will be set to
   */
  constructor (n: number)

  /**
   * Constructs a Vector2 from its coordinates.
   * @param x the X coordinate
   * @param y the Y coordinate
   */
  constructor (x: number, y: number)

  /**
   * Constructs a Vector2 from a tuple.
   * @param xyz the tuple [X, Y, Z]
   */
  constructor (xy: readonly [x: number, y: number])

  /**
   * Used internally.
   */
  constructor (value: Any)

  constructor (value: any, y?: number, z?: number) {
    if (value instanceof Vector2)
      return new Vector2(value.x, value.y)
    else if (Array.isArray(value))
      return new Vector2(...value)
    else if (typeof value === "number" && typeof y === "number")
      return new Vector2(value, y)
    else
      return new Vector2(value, value)
    super()
  }
}

export type Vector2ConstructorSingleParameterTypes = Exclude<
  OverloadedConstructorSingleParameterTypes<typeof Vector2ConstructorExtended>,
  Any
>

/**
 * Additional constructors for {@link Vector3}.
 */
export class Vector3ConstructorExtended extends Vector3 {
  /**
   * Creates a {@link Vector3} from a value of any single parameter type 
   * accepted by the constructor.
   * @param value an initializer value (default `0`)
   * @returns a new {@link Vector3} instance
   */
  static create (value: Vector3ConstructorSingleParameterTypes = 0) {
    return new Vector3ConstructorExtended(value as unknown as Any)
  }

  /**
   * Constructs a {@link Vector3} from another vector.
   * @param vector the vector to copy
   */
  constructor (vector: Readonly<Vector3>)

  /**
   * Constructs a {@link Vector3} from a single number.
   * @param n the value that each coordinate will be set to
   */
  constructor (n: number)

  /**
   * Constructs a {@link Vector3} from its coordinates.
   * @param x the X coordinate
   * @param y the Y coordinate
   * @param z the Z coordinate
   */
  constructor (x: number, y: number, z: number)

  /**
   * Constructs a {@link Vector3} from a tuple.
   * @param xyz the tuple [X, Y, Z]
   */
  constructor (xyz: readonly [x: number, y: number, z: number])

  /**
   * Used internally.
   */
  constructor (value: Any)

  constructor (value: any, y?: number, z?: number) {
    if (value instanceof Vector3)
      return new Vector3(value.x, value.y, value.z)
    else if (Array.isArray(value))
      return new Vector3(...value)
    else if (
      typeof value === "number"
      && typeof y === "number"
      && typeof z === "number"
    )
      return new Vector3(value, y, z)
    else
      return new Vector3(value, value, value)
    super()
  }
}

export type Vector3ConstructorSingleParameterTypes = Exclude<
  OverloadedConstructorSingleParameterTypes<typeof Vector3ConstructorExtended>,
  Any
>
