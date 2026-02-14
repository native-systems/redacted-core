import React, { ReactNode, useId, useMemo } from "react"
import { Vector2, Vector3 } from "three"

import { LayoutContext } from "./Layout"
import { useRenderer } from "../rendering/Renderer"
import { get, RootVolatile, useDerivatedVolatile, Volatile }
  from "../../motion/Volatile"
import { L2PAV } from "../../utils/L2PAV"


type ComponentIdType = ReturnType<typeof useId>

interface StackChild {
  id: ComponentIdType
  output: RootVolatile<Vector3>
  size?: Volatile<Vector2>
  target?: Volatile<Vector2>
  snap?: boolean,
}

const compareChildrenTargets = (
  { target: targetA }: StackChild,
  { target: targetB }: StackChild
) => {
  const ya = (targetA!.current() as Vector2).y
  const yb = (targetB!.current() as Vector2).y
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
  { computeX, spacing = 0, children }: FloatingVerticalStackProps
) => {
  const { beforeRenderSignal } = useRenderer()

  const stackChildren = useMemo(
    () => new Map<ComponentIdType, StackChild>(),
    []
  )

  const computeAuxiliary = useDerivatedVolatile(
    beforeRenderSignal,
    () => {
      const newPositions = new Map<ComponentIdType, [number, number, number]>()

      const sortedUnmanaged = 
        [...stackChildren.values()]
          .filter(({ target }) => !!target)
          .filter(({ snap }) => !snap)
          .sort(compareChildrenTargets)

      sortedUnmanaged.forEach(({ id, target }, i) => {
          const p = get(target!)
          newPositions.set(id, [p.x, p.y, -100 + i * -10])
      })
      
      const sortedManaged =
        [...stackChildren.values()]
          .filter(({ target }) => !!target)
          .filter(({ snap }) => snap)
          .sort(compareChildrenTargets)

      const maxWidth = 
        sortedManaged.reduce((max, { size }) => Math.max(get(size!).x, max), 0)

      const x = computeX(maxWidth)
      const positions = L2PAV(sortedManaged.map(({ target, size }) => {
        const y = get(target!).y
        const [_, currentHeight] = get(size!)
        return {
          position: y - currentHeight,
          size: currentHeight + spacing
        }
      }))
      sortedManaged.forEach(({ id, size }, i) => {
        newPositions.set(id, [x, get(size!).y + positions[i], i * -10])
      })

      for (const [id, position] of newPositions.entries())
        stackChildren.get(id)!.output.set(
          new Vector3(...position)
        )
    },
    [stackChildren, computeX, spacing],
    true
  )

  const layoutManager = useMemo(() => ({
    register (id: ComponentIdType) {
      if (stackChildren.has(id))
        return stackChildren.get(id)!.output
      const output = new RootVolatile<Vector3>
      output.setAuxiliary(computeAuxiliary)
      stackChildren.set(id, { id, output })
      return output
    },
    update (
      id: ComponentIdType,
      size: Volatile<Vector2>,
      target: Volatile<Vector2>,
      snap: boolean
    ) {
      stackChildren.set(id, { ...stackChildren.get(id)!, size, target, snap })
    },
    unregister (id: ComponentIdType) {
      stackChildren.get(id)!.output.unset()
      stackChildren.delete(id)
    }
  }), [stackChildren, computeAuxiliary])

  return (
    <LayoutContext.Provider value={layoutManager}>
      {children}
    </LayoutContext.Provider>
  )
}
