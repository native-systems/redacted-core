import React, { ComponentType, ReactNode, RefObject, useCallback, useEffect,
  useId, useRef } from "react"
import { Box2, Object3D, Vector2, Vector3, Group as ThreeGroup } from "three"

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
import { FlexCell, FlexRow, FlexTable, FlexTableSizeHolder, useFlexTableSize,
  useResize } from "../layout/FlexTable"
import { Position3ValueType } from "../../primitives/ValueTypes"
import { LayerIdentifierType } from "../rendering/LayerStack"
import { warn } from "../../logging/Log"
import { ShaderMaterialExtensionContext }
  from "../material/ExtendedShaderMaterial"
import { clipRectangleExtension }
  from "../../material/extensions/ClipRectangleExtension"
import { Resolve } from "../../motion/Component"


const ForwardResize = ({ children }: { children: ReactNode }) => {
  const { invalidate } = useRenderer()
  const resize = useResize()
  const notifySizeChanged = useCallback(
    () => {
      resize()
      invalidate()
    },
    [invalidate, resize]
  )
  return (
    <LocalLayout notifySizeChanged={notifySizeChanged}>
      {children}
    </LocalLayout>
  )
}

type CommonBoxProps = {
  children: ReactNode
  FrameClass?: ComponentType<FrameProps>
}

const FlexCellWrapper = (
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
  const { transform: { toScaled } } = useLayer()
  const stackComputedBounds = useComputedBounds()
  const size = useVolatile<Vector2>(new Vector2(0, 0))
  const animatedSize = useAnimatedSize(size)
  const boxRef = useRef<ThreeGroup>(null)

  let position = new Vector3()

  const computedBounds = useDelayedDerivatedVolatile(
    [animatedSize, useVolatile(stackComputedBounds)],
    ([_width, height], stackBounds, set: (value: Box2) => void) => {
      if (!boxRef.current)
        return
      boxRef.current.getWorldPosition(position)
      const box = new Box2(
        new Vector2(
          position.x - marginLeft,
          position.y - height - marginBottom
        ),
        new Vector2(
          // Always span the entire width of the container
          position.x + stackBounds.max.x - stackBounds.min.x,
          position.y + marginTop
        )
      ).intersect(stackBounds)
      if (!isFinite(box.min.length()) || !isFinite(box.max.length()))
        set(new Box2(new Vector2(), new Vector2()))
      else
        set(box)
    },
    [marginTop, marginBottom, marginLeft, marginRight]
  )

  const scaledComputedBounds = useDerivatedVolatile(
    computedBounds,
    ({ min, max }) => new Box2(toScaled(min), toScaled(max)),
    [toScaled]
  )

  return (
    <FlexRow>
      <LocalLayout computedBounds={computedBounds}>
        <FlexCell
          sizeReceiver={size}
          size={animatedSize}
          ref={boxRef}
          marginTop={marginTop}
          marginBottom={marginBottom}
          marginLeft={marginLeft}
          marginRight={marginRight}
          height={height}
          width={width}
          >
          <Resolve volatile={computedBounds} />
          <ShaderMaterialExtensionContext
            extension={clipRectangleExtension}
            bounds={scaledComputedBounds}
            >
            <ForwardResize>
              {children}
            </ForwardResize>
          </ShaderMaterialExtensionContext>
        </FlexCell>
      </LocalLayout>
    </FlexRow>
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

  const framePosition = useDerivatedVolatile(
    animatedSize,
    ([width, height]) => [width / 2, -height / 2, 0]
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
        <LocalLayout
          clientWrapperClass={FlexCellWrapper}
          computedBounds={computedBounds}
          {...itemBounds}
          >
          <FlexTable
            columns={1}
            verticalMargin={0}
            horizontalMargin={0}
            >
            {children}
          </FlexTable>
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
  const size = useFlexTableSize()
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
  const size = useFlexTableSize()
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
        <FlexTableSizeHolder key={id}>
          <TargetPositionedVerticalStackBox
            target={target}
            {...props}
            />
        </FlexTableSizeHolder>
      </UpperLayerTransport>
    )
  if (!position)
    warn("No target or position specified in StackBox, defaulting to origin")
  return (
    <UpperLayerTransport layer={layer}>
      <FlexTableSizeHolder key={id}>
        <FixedPositionedVerticalStackBox
          position={position || [0, 0, 0]}
          {...props}
          />
      </FlexTableSizeHolder>
    </UpperLayerTransport>
  )
}
