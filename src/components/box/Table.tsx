import React, { ReactNode, RefObject, createContext, useContext, useRef }
  from "react"
import { Vector2 } from "three"

import { LocalLayout, LocalLayoutClient, useLocalLayoutSettings,
  useNotifySizeChanged } from "../layout/LocalLayout"
import { FlexCell, FlexRow, FlexTable, FlexTableProps, FlexTableSizeHolder,
  useColumnIndex, useFlexTableSize } from "../layout/FlexTable"
import { useDerivatedVolatile, useVolatile } from "../../motion/Volatile"
import { ComponentVolatileRegistry, Resolve,
  useComponentVolatileRegistryHandlers } from "../../motion/Component"
import { useRenderer } from "../rendering/Renderer"
import { useTheme } from "../../configuration/Theme"


type TableWrapperProps = {
  onAfterVolatilesResolved: RefObject<() => void>
} & FlexTableProps

const TableWrapper = (
  { onAfterVolatilesResolved, ...props }: TableWrapperProps
) => {
  const notifySizeChanged = useNotifySizeChanged()
  const size = useFlexTableSize()
  const triggerNotifySymbol = useDerivatedVolatile(size, (_) => {
    // Schedules size change notification after all local volatiles have been
    // resolved, see comment in `Table`
    onAfterVolatilesResolved.current = () => notifySizeChanged()
  }, [notifySizeChanged])
  return (
    <>
      <FlexTable {...props} />
      <Resolve volatile={triggerNotifySymbol} />
    </>
  )
}

const ColumnSpecificationContext = createContext<number[]>([])

type TableProps = {
  children: ReactNode
  columns?: number
  columnMaxInnerWidths?: number[]
}

/**
 * A 2D table which resizes automatically with its content. A maximum column
 * width can be specified for each column with the `columnMaxInnerWidths`
 * property, which is passed as a `maxInnerWidth` property of a
 * {@link LocalLayout} instantiated for each applicable cell.
 * @param props.columns an optional number of columns (default `1`)
 * @param props.columnMaxInnerWidths an optional specification of column widths
 */
export const Table = (
  { children, columns = 1, columnMaxInnerWidths = [] }: TableProps
) => {
  const bounds = useLocalLayoutSettings()
  const { table } = useTheme()

  // Parent components may rely on `Box3.setFromObject` or similar methods to
  // get the size of the table and run their own content adjustment logic. Since
  // the cells positions are defined only after their volatiles got resolved,
  // they may not be up-to-date by the time FlexTable's volatile size gets
  // updated - root volatiles hold correct values but their subtrees may not
  // have yet been refreshed. We "intercept" the children component volatiles in
  // a local component volatile registry and defer the `notifySizeChanged` event
  // so it gets triggered after all such volatiles have been resolved. A symbol
  // resolver binds this local registry to the parent one.
  const { beforeRenderSignal } = useRenderer()
  const onAfterVolatilesResolved = useRef(() => undefined)
  const [
    registerComponentVolatile,
    resolveComponentVolatiles
  ] = useComponentVolatileRegistryHandlers()
  const symbolResolver = useDerivatedVolatile(beforeRenderSignal, (_) => {
    resolveComponentVolatiles()
    onAfterVolatilesResolved.current()
    onAfterVolatilesResolved.current = () => undefined
  })

  return (
    <LocalLayoutClient
      marginLeft={bounds.paddingLeft}
      marginTop={bounds.paddingTop}
      marginRight={bounds.paddingRight}
      marginBottom={bounds.paddingBottom}
      >
      <ComponentVolatileRegistry register={registerComponentVolatile}>
        <FlexTableSizeHolder>
          <TableWrapper
            columns={columns}
            horizontalMargin={table.horizontalMargin}
            verticalMargin={table.verticalMargin}
            onAfterVolatilesResolved={onAfterVolatilesResolved}
            >
            <ColumnSpecificationContext.Provider value={columnMaxInnerWidths}>
              {children}
            </ColumnSpecificationContext.Provider>
          </TableWrapper>
        </FlexTableSizeHolder>
      </ComponentVolatileRegistry>
      <Resolve volatile={symbolResolver} />
    </LocalLayoutClient>
  )
}

/**
 * A 2D table row.
 */
export const Row = ({ children }: { children: ReactNode }) => (
  <FlexRow>{children}</FlexRow>
)

type CellProps = {
  children: ReactNode
  width?: number
  height?: number
  marginLeft?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
}

/**
 * A 2D table cell.
 * @param props.width an optional width
 * @param props.height an optional height
 * @param props.marginLeft an optional left margin
 * @param props.marginTop an optional top margin
 * @param props.marginRight an optional right margin
 * @param props.marginBottom an optional bottom margin
 */
export const Cell = ({ children, ...props }: CellProps) => {
  const columnIndex = useColumnIndex()
  const maxInnerWidth = useContext(ColumnSpecificationContext)?.[columnIndex]
  const size = useVolatile<Vector2>(new Vector2(0, 0))
  if (maxInnerWidth)
    return (
      <FlexCell size={size} sizeReceiver={size} {...props}>
        <LocalLayout maxInnerWidth={maxInnerWidth}>
          {children}
        </LocalLayout>
      </FlexCell>
    )
  return (
    <FlexCell size={size} sizeReceiver={size} {...props}>
      {children}
    </FlexCell>
  )
}
