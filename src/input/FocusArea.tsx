import React from "react"
import "@react-three/fiber"

import { Mesh } from "../components/base/Mesh"
import { PointerEventHandlers, usePointerEventHandlers } from "./InputManager"
import { extractProperties } from "../utils/Properties"
import { use3DScale } from "../utils/Transform"
import { Volatile } from "../motion/Volatile"
import { SizeValueType } from "../types/Space2d"


type EventHandlers = PointerEventHandlers

type FocusAreaCenteredMeshProps = 
  { size: Volatile<SizeValueType> } & EventHandlers 

const FocusAreaCenteredMesh = (
  { size, ...propsAndEventHandlers }: FocusAreaCenteredMeshProps
) => (
    <Mesh scale={use3DScale(size)} {...propsAndEventHandlers}>
      <planeGeometry />
      <meshBasicMaterial visible={false} />
    </Mesh>
)

/**
 * A flat centered plane which can receive `onFocus` and `onBlur` events.
 * @param props.onFocus an optional callback which will receive focus events
 * @param props.onBlur an optional callback which will receive blurring events
 * @param props._extracted.size the plane size
 */
export const FocusArea = extractProperties(
  ({
    _extracted: { size },
    onFocus = () => undefined,
    onBlur = () => undefined
  }) => {
    const eventHandlers = usePointerEventHandlers(onFocus, onBlur)
    return <FocusAreaCenteredMesh size={size} {...eventHandlers} />
  }
)
