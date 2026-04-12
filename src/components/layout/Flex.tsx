import React, { Children, createContext, ReactNode, Ref, useCallback,
  useContext, useEffect, useId, useMemo, useRef } from "react"
import { Box3, Object3D, Vector2, Vector3 } from "three"

import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { Group } from "../base/Group"
import { RootVolatile, useDerivatedVolatile, Volatile, get, useVolatile }
  from "../../motion/Volatile"
import { useForwardableRef } from "../../utils/ForwardableRef"
import { Resolve } from "../../motion/Component"


type ComponentIdType = ReturnType<typeof useId>

interface FlexInterface {
  register (id: ComponentIdType, index: number, size: Volatile<Vector2>):
    [Volatile<Vector3>, () => void]
  refresh (): void
}

const FlexContext = createContext(
  NotImplementedProxy("Flex context is not available") as FlexInterface
)

class BoxState {
  index: number
  position: RootVolatile<Vector3>
  size: Volatile<Vector2>

  constructor (
    index: number,
    size: Volatile<Vector2>,
    computeAuxiliary: Volatile<any>
  ) {
    this.index = index
    this.position = new RootVolatile<Vector3>()
    this.position.setAuxiliary(computeAuxiliary)
    this.size = size
  }
}

const BoxIndexContext = createContext<number>(-1)

const BoxWrapper = (
  { children, index }: { children: ReactNode, index: number }
) => (
  <BoxIndexContext.Provider value={index}>
    {children}
  </BoxIndexContext.Provider>
)

type FlexProps = {
  children: ReactNode
  onReflow: (width: number, height: number) => void
}

export const Flex = ({ children, onReflow }: FlexProps) => {
  const computeSignal = useVolatile(1)

  const boxes = useMemo(
    () => new Map<ComponentIdType, BoxState>(),
    []
  )

  const sortedBoxes = useRef<BoxState[]>(null)

  const computePositions = useDerivatedVolatile(
    computeSignal,
    () => {
      if (!sortedBoxes.current)
        sortedBoxes.current = [...boxes.values()].sort(
          (a, b) => a.index - b.index
        )
      let maxWidth = 0
      let totalHeight = 0
      for (const box of sortedBoxes.current) {
        box.position.set(new Vector3(0, -totalHeight, 0))
        maxWidth = (get(box.size, null)?.x ?? 0) > maxWidth
          ? get(box.size).x
          : maxWidth
        totalHeight += get(box.size, null)?.y ?? 0
      }
      onReflow(maxWidth, totalHeight)
    }
  )

  const flexInterface = useMemo<FlexInterface>(() => ({
    register (id, index, size) {
      if (!boxes.has(id))
        boxes.set(id, new BoxState(index, size, computePositions))
      const { position } = boxes.get(id)!
      sortedBoxes.current = null
      return [
        position,
        () => {
          position.unset()
        }
      ]
    },
    refresh () {
      computeSignal.set(1)
    }
  }), [computePositions, computeSignal])

  return (
    <FlexContext.Provider value={flexInterface}>
      {
        Children.map(children, (child, index) => (
          <BoxWrapper index={index}>{child}</BoxWrapper>
        ))
      }
    </FlexContext.Provider>
  )
}

interface BoxInterface {
  reflow: () => void
}

const defaultBoxInterface: BoxInterface = {
  reflow () { }
}

const BoxContext = createContext(defaultBoxInterface)

export const useReflow = () => useContext(BoxContext).reflow

type BoxProps = {
  ref?: Ref<Object3D>
  children: ReactNode
  sizeReceiver: RootVolatile<Vector2>
  size: Volatile<Vector2>
  width?: number
  height?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
}

export const Box = (
  {
    ref,
    children,
    sizeReceiver,
    size,
    width,
    height,
    marginTop,
    marginBottom,
    marginRight,
    marginLeft
  }: BoxProps
) => {
  const id = useId()
  const index = useContext(BoxIndexContext)
  const [groupRef, assignGroupRef] = useForwardableRef<Object3D>(ref)
  const { refresh, register } = useContext(FlexContext)
  const [position, unregister] = register(id, index, size)

  const positionOffset: [number, number, number] = useMemo(
    () => [marginLeft ?? 0, -(marginTop ?? 0), 0],
    [marginLeft, marginTop]
  )

  let computedSize = new Vector3()

  const boxInterface = useMemo(() => ({
    reflow () {
      if (!groupRef.current)
        return
      const box = new Box3().setFromObject(groupRef.current)
      box.getSize(computedSize)
      computedSize.x += (marginLeft ?? 0) + (marginRight ?? 0)
      computedSize.y += (marginTop ?? 0) + (marginBottom ?? 0)
      if (width)
        computedSize.x = width
      if (height)
        computedSize.y = height
      sizeReceiver.set(new Vector2(computedSize.x, computedSize.y))
    }
  }), [marginTop, marginBottom, marginLeft, marginRight, sizeReceiver])

  useEffect(() => {
    boxInterface.reflow()
  }, [boxInterface, children])

  const setGroupRef = useCallback((group: Object3D) => {
    assignGroupRef(group)
    if (group)
      boxInterface.reflow()
  }, [boxInterface, assignGroupRef])

  const sizeResolver = useDerivatedVolatile(size, () => void refresh())

  useEffect(() => () => unregister(), [])

  return (
    <Group position={position} ref={setGroupRef}>
      <Resolve volatile={sizeResolver} />
      <Group position={positionOffset}>
        <BoxContext.Provider value={boxInterface}>
          {children}
        </BoxContext.Provider>
      </Group>
    </Group>
  )
}
