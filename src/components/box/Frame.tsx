import React, { ReactNode, useCallback,  useRef } from "react"
import { DoubleSide } from "three"
import { ThreeElements } from "@react-three/fiber"

import { Line, LineStaticProps, ThreeLine } from "../base/Line"
import { Mesh } from "../base/Mesh"
import { useDerivatedVolatile, useVolatile, Volatile }
  from "../../motion/Volatile"
import { Group } from "../base/Group"
import { Vector2 } from "../../primitives/Vector2"
import { Position3ValueType } from "../../types/Space3d"
import { SizeValueType } from "../../types/Space2d"


const FrameMesh = (
  { size, children }: { size: Volatile<Vector2>, children: ReactNode }
) => {
  const scale = useDerivatedVolatile(
    size,
    (size) => [size.x - 2, size.y - 2, 1]
  )
  return <Mesh scale={scale}>{children}</Mesh>
}

export type FrameProps = {
  position: Position3ValueType | Volatile<Position3ValueType>
  size: SizeValueType | Volatile<SizeValueType>
  z?: number
  borderColor?: LineStaticProps["color"]
  borderOpacity?: LineStaticProps["opacity"]
} & ThreeElements["meshBasicMaterial"]

/**
 * A centered rectangular frame with a border.
 * @param props.position the frame position
 * @param props.size the frame size
 * @param props.borderColor the border color
 * @param props.borderOpacity the border opacity
 * @param props.z the Z coordinate
 * @param props `<meshBasicMaterial>` properties
 */
export const Frame = (
  { position, size, borderColor, borderOpacity, z = 0, ...props }:
    FrameProps
) => {
  const line = useRef<ThreeLine>(null)
  const volatileSize = useDerivatedVolatile(
    useVolatile(size),
    (size: SizeValueType) => Vector2.create(size)
  )

  const computeBorderPoints = useCallback((size: Vector2) => {
    return [
      [-size.x / 2 + 1, -size.y / 2 + 1, z + 1],
      [-size.x / 2 + 1, size.y / 2 - 1, z + 1],
      [size.x / 2 - 1, size.y / 2 - 1, z + 1],
      [size.x / 2 - 1, -size.y / 2 + 1, z + 1],
      [-size.x / 2 + 1, -size.y / 2 + 1, z + 1],
    ]
  }, [z])

  return (
    <Group position={position}>
      <FrameMesh size={volatileSize}>
        <planeGeometry />
        <meshBasicMaterial
          side={DoubleSide}
          transparent
          {...props}
          />
      </FrameMesh>
      <Line
        ref={line}
        volatile={volatileSize}
        computePoints={computeBorderPoints}
        color={borderColor}
        opacity={borderOpacity}
        transparent
        />
    </Group>
  )
}
