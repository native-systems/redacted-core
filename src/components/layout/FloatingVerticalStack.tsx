import React, { ReactNode, useId, useMemo } from "react"
import { create, StoreApi } from "zustand"

import { LayoutContext } from "./Layout"
import { useRenderer } from "../rendering/Renderer"
import { Resolve } from "../../motion/Component"
import { get, RootVolatile, useDerivatedVolatile, Volatile }
  from "../../motion/Volatile"
import { L2PAV } from "../../utils/L2PAV"
import { SizeValueType } from "../../types/Space2d"
import { Vector2 } from "../../primitives/Vector2"
import { ThreeVector3 } from "../../primitives"


type ComponentIdType = ReturnType<typeof useId>

interface StackChild {
  id: ComponentIdType
  size: SizeValueType
  target: Volatile<Vector2>
  snap: boolean
}

type StackChildren = Map<ComponentIdType, StackChild>

type StackPositions = Map<ComponentIdType, [number, number, number]>

interface Stack {
  version: number
  children: StackChildren
  positions: StackPositions
  register (
    id: ComponentIdType,
    size: SizeValueType,
    target: Volatile<Vector2>,
    snap: boolean
  ): void
  unregister (id: ComponentIdType): void
  setPositions (positions: StackPositions): void
}

let stacks = new Map<ComponentIdType, StoreApi<Stack>>()

const findOrCreateStack = (id: ComponentIdType) => {
  if (stacks.has(id))
    return stacks.get(id)!
  const store = create<Stack>(set => ({
    version: 0,
    children: new Map(),
    positions: new Map(),
    register: (id, size, target, snap) => set((state) => {
      state.children.set(id, { id, size, target, snap })
      return { version: state.version + 1 }
    }),
    unregister: (id) => set((state) => {
      state.children.delete(id)
      state.positions.delete(id)
      return { version: state.version + 1 }
    }),
    setPositions: (positions) => set((state) => {
      return { version: state.version + 1, positions }
    })
  }))
  stacks.set(id, store)
  return store
}

const compareChildrenTargets = (
  { target: targetA }: StackChild,
  { target: targetB }: StackChild
) => {
  const ya = (targetA.current() as Vector2).y
  const yb = (targetB.current() as Vector2).y
  return ya - yb
}

type FloatingVerticalStackProps = {
  computeX: (width: number) => number
  children: ReactNode
  spacing?: number
}

/**
 * Aligns layout clients on a vertical column.
 * @param props.computeX a function that computes the X offset of the column
 * @param props.spacing an optional spacing parameter (default 0)
 * @returns 
 */
export const FloatingVerticalStack = (
  { computeX, children, spacing = 0 }: FloatingVerticalStackProps
) => {
  const { beforeRenderSignal } = useRenderer()
  const stackId = useId()

  const layoutManager = useMemo(() => ({
    register (
      id: ComponentIdType,
      size: SizeValueType,
      target: Volatile<Vector2>,
      snap: boolean
    ) {
      findOrCreateStack(stackId).getState().register(id, size, target, snap)
    },
    unregister (id: ComponentIdType) {
      findOrCreateStack(stackId).getState().unregister(id)
    },
    bindPosition (
      id: ComponentIdType,
      position: RootVolatile<ThreeVector3>
    ) {
      return findOrCreateStack(stackId).subscribe((state) => {
        if (state.positions.has(id))
          position.set(new ThreeVector3(...(state.positions.get(id)!)))
        else
          position.unset()
      })
    },
    computePositions () {
      const stack = findOrCreateStack(stackId)
      const newPositions = new Map<ComponentIdType, [number, number, number]>()

      const sortedUnmanaged = 
        [...stack.getState().children.values()]
          .filter(({ snap }) => !snap)
          .sort(compareChildrenTargets)

      sortedUnmanaged.forEach(({ id, target }, i) => {
          const p = get(target)
          newPositions.set(id, [p.x, p.y, -100 + i * -10])
      })
      
      const sortedManaged =
        [...stack.getState().children.values()]
          .filter(({ snap }) => snap)
          .sort(compareChildrenTargets)

      const maxWidth = 
        sortedManaged.reduce((max, { size }) => Math.max(get(size)[0], max), 0)

      const x = computeX(maxWidth)
      const positions = L2PAV(sortedManaged.map(({ target, size }) => {
        const y = get(target).y
        const [_, currentHeight] = get(size)
        return {
          position: y - currentHeight,
          size: currentHeight + spacing
        }
      }))
      sortedManaged.forEach(({ id, size }, i) => {
        newPositions.set(id, [x, get(size)[1] + positions[i], i * -10])
      })

      stack.getState().setPositions(newPositions)
    }
  }), [computeX, spacing])

  const symbol = useDerivatedVolatile(
    beforeRenderSignal,
    () => layoutManager.computePositions(),
    [layoutManager]
  )

  return (
    <LayoutContext.Provider value={layoutManager}>
      {children}
      <Resolve volatile={symbol} />
    </LayoutContext.Provider>
  )
}
