import React, { Children, createContext, ReactNode, Ref, useCallback,
  useContext, useEffect, useId, useMemo, useRef } from "react"
import { Box3, Object3D, Vector2, Vector3 } from "three"

import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { Group } from "../base/Group"
import { RootVolatile, useDerivatedVolatile, Volatile, get, useVolatile }
  from "../../motion/Volatile"
import { useForwardableRef } from "../../utils/ForwardableRef"
import { Resolve } from "../../motion/Component"
import { LocalLayout, LocalLayoutClientContainerProps, useLocalLayoutSettings }
  from "./LocalLayout"


type ComponentIdType = ReturnType<typeof useId>

interface TableInterface {
  register (
    id: ComponentIdType,
    row: number,
    column: number,
    size: Volatile<Vector2>
  ): [Volatile<Vector3>, () => void]
  refresh (): void
}

const TableContext = createContext(
  NotImplementedProxy("FlexTable context is not available") as TableInterface
)

class CellState {
  row: number
  column: number
  position: RootVolatile<Vector3>
  size: Volatile<Vector2>

  constructor (
    row: number,
    column: number,
    size: Volatile<Vector2>,
    computeAuxiliary: Volatile<any>
  ) {
    this.row = row
    this.column = column
    this.position = new RootVolatile<Vector3>()
    this.position.setAuxiliary(computeAuxiliary)
    this.size = size
  }
}

const RowIndexContext = createContext<number>(-1)
const ColumnIndexContext = createContext<number>(-1)

const RowWrapper = (
  { children, row }: { children: ReactNode, row: number }
) => {
  return (
    <RowIndexContext.Provider value={row}>
      {children}
    </RowIndexContext.Provider>
  )
}

const ColumnWrapper = (
  { children, column }: { children: ReactNode, column: number }
) => {
  return (
    <ColumnIndexContext.Provider value={column}>
      {children}
    </ColumnIndexContext.Provider>
  )
}

export type FlexTableProps = {
  children: ReactNode
  columns: number
  horizontalMargin: number
  verticalMargin: number
  onResize: (width: number, height: number) => void
}

/**
 * A 2D table layout which automatically resizes when its content changes. This
 * component does not follow local layout settings and does not instantiate
 * layout clients; bounds must be taken care of by the parent component. When a
 * resize event happens, the table refreshes the position of its cells and calls
 * the `onResize` callback with the new width and height as parameters. Note
 * that this call may happen before the cell content is actually repositioned,
 * since volatiles are lazy-resolved on render.
 * @param props.columns the number of columns
 * @param props.horizontalMargin the margin between columns
 * @param props.verticalMargin the margin between rows
 * @param props.onResize a callback to call after the table was resized
 */
export const FlexTable = (
  {
    children,
    columns,
    horizontalMargin,
    verticalMargin,
    onResize
  }: FlexTableProps
) => {
  const bounds = useLocalLayoutSettings()
  const computeSignal = useVolatile(1)

  const cells = useMemo(
    () => new Map<ComponentIdType, CellState>(),
    []
  )

  const sortedCells = useRef<CellState[][]>(null)

  const computePositions = useDerivatedVolatile(
    computeSignal,
    () => {
      if (!sortedCells.current) {
        sortedCells.current = []
        for (let i = 0; i < columns; i++)
          sortedCells.current.push(
            [...cells.values()]
              .filter(({ column }) => column == i)
              .sort((a, b) => a.row - b.row)
          )
      }
      const columnSizes = new Array(columns)
      const rowSizes = new Array(sortedCells.current[0].length)
      let xOffset = 0
      sortedCells.current.forEach((rows, columnIndex) => {
        rows.forEach((cell, rowIndex) => {
          const width = get(cell.size, null)?.x ?? 0
          const height = get(cell.size, null)?.y ?? 0
          if (!columnSizes[columnIndex] || columnSizes[columnIndex] < width)
            columnSizes[columnIndex] = width
          if (!rowSizes[rowIndex] || rowSizes[rowIndex] < height)
            rowSizes[rowIndex] = height
        })
      })
      sortedCells.current.forEach((rows, columnIndex) => {
        let height = 0
        rows.forEach((cell, rowIndex) => {
          cell.position.set(new Vector3(xOffset, -height, 0))
          height += rowSizes[rowIndex] + verticalMargin
        })
        xOffset += columnSizes[columnIndex] + horizontalMargin
      })
      onResize(
        columnSizes.reduce(
          (total, size) => total + size + horizontalMargin,
          0
        ),
        rowSizes.reduce(
          (total, size) => total + size + verticalMargin,
          0
        )
      )
    },  
    [onResize, horizontalMargin, verticalMargin]
  )

  const flexInterface = useMemo<TableInterface>(() => ({
    register (id, row, column, size) {
      if (!cells.has(id))
        cells.set(id, new CellState(row, column, size, computePositions))
      const { position } = cells.get(id)!
      sortedCells.current = null
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
    <Group position={useMemo(() => [0, 0, 0], [bounds])}>
      <TableContext.Provider value={flexInterface}>
        {
          Children.map(children, (child, index) => (
            <RowWrapper row={index}>
              {child}
            </RowWrapper>
          ))
        }
      </TableContext.Provider>
    </Group>
  )
}

/**
 * A 2D table row for use with {@link FlexTable}.
 */
export const FlexRow = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {
        Children.map(children, (child, index) => (
          <ColumnWrapper column={index}>
            {child}
          </ColumnWrapper>
        ))
      }
    </>
  )
}

interface CellInterface {
  resize: () => void
}

const defaultCellInterface: CellInterface = {
  resize () { }
}

const CellContext = createContext(defaultCellInterface)

type FlexCellProps = {
  ref?: Ref<Object3D>
  children: ReactNode
  sizeReceiver: RootVolatile<Vector2>
  size: Volatile<Vector2>
  width?: number
  height?: number
  marginLeft?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
}

const CellLayoutClient = 
  ({ children }: LocalLayoutClientContainerProps) => <>{children}</>

/**
 * A 2D table cell for use with {@link FlexTable} and {@link FlexRow}.
 * @param props.ref an optional {@link useForwardableRef}-returned ref
 * @param props.sizeReceiver a {@link RootVolatile} {@link Vector2} size setter
 * @param props.size a {@link Volatile} {@link Vector2} size getter
 * @param props.width an optional width
 * @param props.height an optional height
 * @param props.marginLeft an optional left margin
 * @param props.marginTop an optional top margin
 * @param props.marginRight an optional right margin
 * @param props.marginBottom an optional bottom margin
 */
export const FlexCell = (
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
  }: FlexCellProps
) => {
  const id = useId()
  const row = useContext(RowIndexContext)
  const column = useContext(ColumnIndexContext)
  const [groupRef, assignGroupRef] = useForwardableRef<Object3D>(ref)
  const { refresh, register } = useContext(TableContext)
  const [position, unregister] = register(id, row, column, size)

  const positionOffset: [number, number, number] = useMemo(
    () => [marginLeft ?? 0, -(marginTop ?? 0), 0],
    [marginLeft, marginTop]
  )

  let computedSize = new Vector3()

  const cellInterface = useMemo(() => ({
    resize () {
      if (!groupRef.current)
        return
      const cell = new Box3().setFromObject(groupRef.current)
      cell.getSize(computedSize)
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
    cellInterface.resize()
  }, [cellInterface, children])

  const setGroupRef = useCallback((group: Object3D) => {
    assignGroupRef(group)
    if (group)
      cellInterface.resize()
  }, [cellInterface, assignGroupRef])

  const sizeResolver = useDerivatedVolatile(size, () => void refresh())

  useEffect(() => () => unregister(), [])

  return (
    <Group position={position} ref={setGroupRef}>
      <Resolve volatile={sizeResolver} />
      <Group position={positionOffset}>
        <CellContext.Provider value={cellInterface}>
          <LocalLayout
            notifySizeChanged={cellInterface.resize}
            clientWrapperClass={CellLayoutClient}
            >
            {children}
          </LocalLayout>
        </CellContext.Provider>
      </Group>
    </Group>
  )
}

/**
 * Hook which returns a function to call when the content of a cell changes.
 * @returns a `resize` callback
 */
export const useResize = () => useContext(CellContext).resize

/**
 * Hook which returns the index of the current row.
 * @returns the index of current row, starting at `0`
 */
export const useColumnIndex = () => useContext(ColumnIndexContext)
