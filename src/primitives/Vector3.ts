import { Vector3 as ThreeVector3 } from "three"
import { OverloadedConstructorSingleParameterType }
  from "../utils/OverloadedConstructorSingleParameterType"


type Any = "_vector3_any_constructor_single_parameter_type"

export { ThreeVector3 }

// TODO: verify the relevance of this thing
/**
 * {@link ThreeVector3 THREE.Vector3} with additional constructors.
 */
export class Vector3 extends ThreeVector3 {
  /**
   * Creates a {@link Vector3} from a value of any single parameter type 
   * accepted by the constructor.
   * @param value an initializer value (default `0`)
   * @returns a new {@link Vector3} instance
   */
  static create (value: Vector3ConstructorSingleParameterTypes = 0) {
    return new Vector3(value as unknown as Any)
  }

  /**
   * Constructs a Vector3 from another vector.
   * @param vector the vector to copy
   */
  constructor(vector: ThreeVector3 | Readonly<ThreeVector3>)

  /**
   * Constructs a Vector3 from a single number.
   * @param n the value that each coordinate will be set to
   */
  constructor(n: number)

  /**
   * Constructs a Vector3 from its coordinates.
   * @param x the X coordinate
   * @param y the Y coordinate
   * @param z the Z coordinate
   */
  constructor(x: number, y: number, z: number)

  /**
   * Constructs a Vector3 from a tuple.
   * @param xyz the tuple [X, Y, Z]
   */
  constructor(
    xyz: 
      [x: number, y: number, z: number]
      | readonly [x: number, y: number, z: number]
  )

  /**
   * Used internally.
   */
  constructor(value: Any)

  constructor(value: any, y?: number, z?: number) {
    if (value instanceof ThreeVector3)
      super(value.x, value.y, value.z)
    else if (Array.isArray(value))
      super(...value)
    else if (
      typeof value === "number"
      && typeof y === "number"
      && typeof z === "number"
    )
      super(value, y, z)
    else
      super(value, value, value)
  }
}

export type Vector3ConstructorSingleParameterTypes =
  Exclude<OverloadedConstructorSingleParameterType<typeof Vector3>, Any>
