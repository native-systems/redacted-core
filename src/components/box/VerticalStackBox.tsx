import React, { ComponentType, ReactNode, RefObject, useCallback, useEffect,
  useId, useRef } from "react"
import { Box2, Object3D, Vector2, Vector3, Group as ThreeGroup } from "three"
import { useFlexSize, useReflow } from "@react-three/flex"

import { RootVolatile, useDelayedDerivatedVolatile, useDerivatedVolatile,
  useVolatile, Volatile } from "../../motion/Volatile"
import { Group } from "../base/Group"
import { UpperLayerTransport } from "../rendering/UpperLayerTransport"
import { useBoundingBox } from "../../tracking/BoundingBox"
import { usePosition } from "../layout/Layout"
import { useAnimatedPosition, useAnimatedSize } from "../../motion/Animation"
import { useTheme } from "../../configuration/Theme"
import { LocalLayout, LocalLayoutClientContainerProps, useComputedBounds }
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
  from "../material/ExtendedShaderMaterial"
import { clipRectangleExtension }
  from "../../material/extensions/ClipRectangleExtension"


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

const MarginCorrectedBox = (
  {
    height,
    width,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    children
  }: LocalLayoutClientContainerProps
) => {
  const reflow = useReflow()
  const size = useVolatile<Vector2>()
  const boxRef = useRef<ThreeGroup>(null)
  const stackComputedBounds = useComputedBounds()

  // TODO: replace react-three-flex entirely and implement a non-reactive
  // object positioning component set that allows smooth animations at the
  // client level

  let position = new Vector3()

  const computedBounds = useDelayedDerivatedVolatile(
    [size, useVolatile(stackComputedBounds)],
    ([_width, height], stackBounds, set: (value: Box2) => void) => {
      if (!boxRef.current)
        return
      boxRef.current.getWorldPosition(position)
      set(
        new Box2(
          new Vector2(
            position.x - marginLeft - marginRight,
            position.y - height
          ),
          new Vector2(
            // Always span the entire width of the container
            position.x
              + stackBounds.max.x - stackBounds.min.x
              - marginLeft - marginRight,
            position.y + marginTop + marginBottom
          )
        ).intersect(stackBounds)
      )
    }
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
        {/* Flexbox does not take marginBottom and marginRight into account */}
        <Group position={[-marginRight, marginBottom, 1]}>
          {children}
        </Group>
      </Box>
    </LocalLayout>
  )
}

type VerticalStackBoxImplProps = {
  position: Volatile<Position3ValueType>
  size: RootVolatile<Vector2>
  animatedSize: Volatile<Vector2>
} & CommonBoxProps

const VerticalStackBoxImpl = (
  {
    position,
    size,
    animatedSize,
    children,
    FrameClass = Frame
  }: VerticalStackBoxImplProps
) => {
  const { invalidate } = useRenderer()
  const { transform: { toScaled } } = useLayer()
  const theme = useTheme()
  const animatedPosition = useAnimatedPosition(position)

  const itemBounds = {
    paddingLeft: theme.box.verticalBorder,
    paddingTop: theme.box.horizontalBorder,
    paddingRight: theme.box.verticalBorder,
    paddingBottom: theme.box.horizontalBorder,
    maxInnerWidth: theme.box.width - 2 - theme.box.verticalBorder * 2,
    maxOuterWidth: theme.box.width
  }

  const computedBounds = useDerivatedVolatile(
    [animatedPosition, animatedSize],
    (position, [width, height]) => (
      new Box2(
        new Vector2(position.x, position.y - height),
        new Vector2(position.x + width, position.y)
      )
    )
  )

  const scaledComputedBounds = useDerivatedVolatile(
    computedBounds,
    ({ min, max }) => new Box2(toScaled(min), toScaled(max))
  )

  const framePosition = useDerivatedVolatile(
    animatedSize,
    ([width, height]) => [width / 2, -height / 2, 0]
  )

  const onReflow = useCallback(
    (width: number, height: number) => {
      size.set(new Vector2(width, height))
      invalidate()
    },
    [size, invalidate]
  )

  return (
    <Group position={animatedPosition}>
      <FrameClass
        position={framePosition}
        size={animatedSize}
        color={theme.box.backgroundColor}
        opacity={theme.box.backgroundOpacity}
        borderColor={theme.box.borderColor}
        borderOpacity={theme.box.borderOpacity}
        />
      <ShaderMaterialExtensionContext
        extension={clipRectangleExtension}
        bounds={scaledComputedBounds}
        >
        <LocalLayout
          clientWrapperClass={MarginCorrectedBox}
          computedBounds={computedBounds}
          {...itemBounds}
          >
          <Flex onReflow={onReflow}>
            {children}
          </Flex>
        </LocalLayout>
      </ShaderMaterialExtensionContext>
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
  const size = useVolatile(new Vector2())
  const animatedSize = useAnimatedSize(size)
  const wants = useDerivatedVolatile(
    targetBoundingBox,
    box => fromNormalized(box.max),
    [fromNormalized]
  )
  let position = usePosition(animatedSize, wants, snap)
  __DEBUG_STATEMENT__: {
    position = useVolatileReadinessCheck(
      position,
      "TargetPositionedVerticalStackBox.position switched not ready"
    )
  }
  return (
    <VerticalStackBoxImpl
      position={position}
      size={size}
      animatedSize={animatedSize}
      {...props}
      />
  )
}

type FixedPositionedVerticalStackBoxProps = {
  position: Position3ValueType
} & CommonBoxProps

const FixedPositionedVerticalStackBox = (
  { position, ...props }: FixedPositionedVerticalStackBoxProps
) => {
  const volatilePosition = useVolatile(position)
  const size = useVolatile(new Vector2())
  useEffect(() => volatilePosition.set(position), [position])
  return (
    <VerticalStackBoxImpl
      position={volatilePosition}
      size={size}
      animatedSize={size}
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
