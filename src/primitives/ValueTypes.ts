import { Vector3 } from "three"

import { Vector2ConstructorSingleParameterTypes,
  Vector3ConstructorSingleParameterTypes } from "./Constructors"


export type Position2ValueType = Vector2ConstructorSingleParameterTypes
export type Scale2ValueType = Vector2ConstructorSingleParameterTypes
export type SizeValueType = Vector2ConstructorSingleParameterTypes

export type Position3ValueType = Vector3ConstructorSingleParameterTypes
export interface Positionable { position: Vector3 }
export type Scale3ValueType = Vector3ConstructorSingleParameterTypes
export interface Scalable { scale: Vector3 }
