import React from "react"
import "@react-three/fiber"

import { Mesh } from "../base/Mesh"
import { PointerEventHandlers, usePointerEventHandlers }
  from "../../input/InputManager"
import { ExtractedProps, extractProperties } from "../../utils/Properties"
import { use3DScaleFromSize } from "../../utils/Transform"
import { PotentialVolatile, Volatile } from "../../motion/Volatile"
import { Position3ValueType, SizeValueType } from "../../primitives/ValueTypes"


type EventHandlers = PointerEventHandlers

type FocusAreaCenteredMeshProps = {
  position: PotentialVolatile<Position3ValueType>
  size: Volatile<SizeValueType>
} & EventHandlers 

const FocusAreaMesh = (
  { position, size, ...propsAndEventHandlers }: FocusAreaCenteredMeshProps
) => (
    <Mesh
      position={position}
      scale={use3DScaleFromSize(size)}
      {...propsAndEventHandlers}
      >
      <planeGeometry />
      <meshBasicMaterial visible={false} />
    </Mesh>
)

export type FocusAreaEventHandlers = {
  onFocus?: () => undefined
  onBlur?: () => undefined
}

type FocusAreaProps = {
  _extracted: ExtractedProps
  position: PotentialVolatile<Position3ValueType>
} & FocusAreaEventHandlers

/**
 * A flat centered plane which can receive `onFocus` and `onBlur` events.
 * @param props.position an optional center position
 * @param props.onFocus an optional callback which will receive focus events
 * @param props.onBlur an optional callback which will receive blurring events
 * @param props._extracted.size the plane size
 */
export const FocusArea = extractProperties(
  ({
    _extracted: { size },
    position = [0, 0, 0],
    onFocus = () => undefined,
    onBlur = () => undefined
  }: FocusAreaProps) => {
    const eventHandlers = usePointerEventHandlers(onFocus, onBlur)
    return <FocusAreaMesh position={position} size={size} {...eventHandlers} />
  }
)
