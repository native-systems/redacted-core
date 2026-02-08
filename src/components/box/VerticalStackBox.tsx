import React, { ComponentType, createContext, forwardRef, ReactNode, RefObject,
  useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo,
  useRef } from "react"
import { Box2, Object3D, Vector2, Vector3, Group as ThreeGroup } from "three"
import { useFlexSize, useReflow } from "@react-three/flex"

import { RootVolatile, useDelayedDerivatedVolatile, useDerivatedVolatile,
  useVolatile, Volatile } from "../../motion/Volatile"
import { Group } from "../base/Group"
import { UpperLayerTransport } from "../rendering/UpperLayerTransport"
import { useBoundingBox } from "../../tracking/BoundingBox"
import { usePosition } from "../layout/Layout"
import { useAnimatedPosition } from "../../motion/Animation"
import { useTheme } from "../../configuration/Theme"
import { LocalLayout, LocalLayoutClientContainerProps }
  from "../layout/LocalLayout"
import { Frame, FrameProps } from "./Frame"
import { useLayer } from "../rendering/Layer"
import { useRenderer } from "../rendering/Renderer"
import { useVolatileReadinessCheck } from "../../utils/Debug"
import { Flex, Box } from "../layout/Flex"
import { SizeValueType, Position3ValueType } from "../../primitives/ValueTypes"
import { LayerIdentifierType } from "../rendering/LayerStack"
import { warn } from "../../logging/Log"
import { ShaderMaterialExtensionContext }
  from "../../shading/ShaderMaterialExtensionContext"
import { clipRectangleExtension }
  from "../../shading/extensions/ClipRectangleExtension"


const StackPositionContext = createContext<Volatile<Position3ValueType>>(null!)

const SizeReporter = (
  { volatileSize }: { volatileSize: RootVolatile<SizeValueType> }
) => {
  const { invalidate } = useRenderer()
  const [width, height] = useFlexSize()
  useEffect(() => {
    volatileSize.set([width, height])
    invalidate()
  }, [invalidate, width, height])
  return <></>
}

type CommonBoxProps = {
  children: ReactNode
  FrameClass?: ComponentType<FrameProps>
}

// Flexbox does not take marginBottom and marginRight into account
const MarginCorrectedBox = forwardRef(
  ({
    height,
    width,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    children
  }: LocalLayoutClientContainerProps, ref) => {
    const reflow = useReflow()
    const { transform: { toScaled } } = useLayer()
    const size = useVolatile<SizeValueType>()
    const boxRef = useRef<ThreeGroup>(null)
    const stackPosition = useContext(StackPositionContext)

    let position = new Vector3()

    const computedBounds = useDelayedDerivatedVolatile(
      [size, stackPosition],
      ([width, height], _, set: (value: Box2) => void) => {
        if (!boxRef.current)
          return
        boxRef.current.getWorldPosition(position)
        set(
          new Box2(
            toScaled(new Vector2(
              position.x - marginRight,
              position.y - height + marginBottom
            )),
            toScaled(new Vector2(
              position.x + width - marginRight,
              position.y + marginBottom
            ))
          )
        )
      }
    )

    const layoutClientInterface = useMemo(
      () => ({ computedBounds }),
      [computedBounds]
    )

    useImperativeHandle(
      ref,
      () => layoutClientInterface,
      [layoutClientInterface]
    )

    return (
      <LocalLayout notifySizeChanged={reflow} computedBounds={computedBounds}>
        <Box
          ref={boxRef}
          marginTop={marginTop + marginBottom}
          marginLeft={marginLeft + marginRight}
          height={height}
          width={width}
          >
          <SizeReporter volatileSize={size} />
          <Group position={[-marginRight, marginBottom, 1]}>
            <ShaderMaterialExtensionContext
              extension={clipRectangleExtension}
              bounds={computedBounds}
              >
              {children}
            </ShaderMaterialExtensionContext>
          </Group>
        </Box>
      </LocalLayout>
    )
  }
)

type VerticalStackBoxImplProps = {
  position: Volatile<Position3ValueType>
  size: RootVolatile<SizeValueType>
} & CommonBoxProps

const VerticalStackBoxImpl = (
  { position, size, children, FrameClass = Frame }: VerticalStackBoxImplProps
) => {
  const { invalidate } = useRenderer()
  const theme = useTheme()
  const animatedPosition = useAnimatedPosition(position, 2000)
  const framePosition = useDerivatedVolatile(
    size,
    ([width, height]) => [width / 2, -height / 2, 0]
  )

  const onReflow = useCallback(
    (width: number, height: number) => {
      size.set([width, height])
      invalidate()
    },
    [size, invalidate]
  )

  const itemBounds = {
    paddingLeft: theme.box.verticalBorder,
    paddingTop: theme.box.horizontalBorder,
    paddingRight: theme.box.verticalBorder,
    paddingBottom: theme.box.horizontalBorder,
    maxInnerWidth: theme.box.width - theme.box.verticalBorder * 2,
    maxOuterWidth: theme.box.width - 2
  }

  return (
    <Group position={animatedPosition}>
      <FrameClass
        position={framePosition}
        size={size}
        color={theme.box.backgroundColor}
        opacity={theme.box.backgroundOpacity}
        borderColor={theme.box.borderColor}
        borderOpacity={theme.box.borderOpacity}
        />
      <LocalLayout
        clientWrapperClass={MarginCorrectedBox}
        {...itemBounds}
        >
        <Flex onReflow={onReflow}>
          <StackPositionContext.Provider value={animatedPosition}>
            {children}
          </StackPositionContext.Provider>
        </Flex>
      </LocalLayout>
    </Group>
  )
}

type TargetPositionedVerticalStackBoxProps = {
  target: RefObject<Object3D>
  snap?: boolean
} & CommonBoxProps

const TargetPositionedVerticalStackBox = (
  { target, snap = false, ...props }: TargetPositionedVerticalStackBoxProps
) => {
  const { transform: { fromNormalized } } = useLayer()
  const targetBoundingBox = useBoundingBox(target)
  const size = useVolatile<SizeValueType>([0, 0])
  const wants = useDerivatedVolatile(
    targetBoundingBox,
    box => fromNormalized(box.max),
    [fromNormalized]
  )
  let position = usePosition(size, wants, snap)
  __DEBUG_STATEMENT__: {
    position = useVolatileReadinessCheck(
      position,
      "TargetPositionedVerticalStackBox.position switched not ready"
    )
  }
  return <VerticalStackBoxImpl position={position} size={size} {...props} />
}

type FixedPositionedVerticalStackBoxProps = {
  position: Position3ValueType
} & CommonBoxProps

const FixedPositionedVerticalStackBox = (
  { position, ...props }: FixedPositionedVerticalStackBoxProps
) => {
  const volatilePosition = useVolatile(position)
  const size = useVolatile<SizeValueType>([0, 0])
  useEffect(() => volatilePosition.set(position), [position])
  return (
    <VerticalStackBoxImpl
      position={volatilePosition}
      size={size}
      {...props}
      />
  )
}

type VerticalStackBoxProps = {
  layer: LayerIdentifierType
  target?: RefObject<Object3D>
  position?: Position3ValueType
  snap?: boolean
} & CommonBoxProps

/**
 * A 2D box which auto-resizes and aligns its content in a vertical stack. When
 * provided, the normalized `target` volatile position is used as a left anchor
 * point. When `snap` is true, the box will get its position from the current
 * layout manager.
 * @param props.layer the layer to render the box in
 * @param props.target an optional volatile target position
 * @param props.snap optional; if `true`, uses the layout manager
 * @param props.position an optional position when no target is defined
 * @param props.FrameClass an optional component class rendering the box frame
 */
export const VerticalStackBox = (
  { layer, target = undefined, position = undefined, ...props }:
    VerticalStackBoxProps
) => {
  const id = useId()
  if (target)
    return (
      <UpperLayerTransport layer={layer}>
        <TargetPositionedVerticalStackBox
          key={id}
          target={target}
          {...props}
          />
      </UpperLayerTransport>
    )
  if (!position)
    warn("No target or position specified in StackBox, defaulting to origin")
  return (
    <UpperLayerTransport layer={layer}>
      <FixedPositionedVerticalStackBox
        key={id}
        position={position || [0, 0, 0]}
        {...props}
        />
    </UpperLayerTransport>
  )
}
