import { ThreeVector3,  Vector3ConstructorSingleParameterTypes }
  from "../primitives/Vector3"


export type Position3ValueType = Vector3ConstructorSingleParameterTypes
export interface Positionable { position: ThreeVector3 }

export type Scale3ValueType = Vector3ConstructorSingleParameterTypes
export interface Scalable { scale: ThreeVector3 }
