import React, { ComponentProps, ComponentType, useMemo } from "react"

import { PotentialVolatile, useDerivatedVolatile, useVolatile, Volatile }
  from "../motion/Volatile"
import { SizeValueType } from "../primitives/ValueTypes"


/**
 * Type of the `_extracted` property.
 */
export type ExtractedProps = {
  size: Volatile<SizeValueType>
  width: Volatile<number>
  height: Volatile<number>
}

type ComponentPropsWithoutExtracted <C extends ComponentType<any>> =
  Omit<ComponentProps<C>, "_extracted">

type ExtractSizeImplProps <C extends ComponentType<any>> = {
  Class: C
} & ExtractedProps & ComponentProps<C>

const ExtractSizeImpl = <C extends ComponentType<any>> (
  { Class, size, width, height, ...props }: ExtractSizeImplProps<C>
) => {
  const extracted = useMemo(
    () => ({ size, width, height }),
    [size, width, height]
  )
  return <Class _extracted={extracted} {...props} />
}

type ExtractSizeProperty = {
  size: PotentialVolatile<SizeValueType>
}

type ExtractWidthHeightProperties = {
  width: PotentialVolatile<number>
  height: PotentialVolatile<number>
}

const ExtractWidthHeight = <C extends ComponentType<any>> (
  { size, ...props }:
    ExtractSizeProperty
      & ComponentPropsWithoutExtracted<C>
) => {
  const volatileSize = useVolatile(size)
  return (
    <ExtractSizeImpl
      size={volatileSize}
      width={useDerivatedVolatile(volatileSize, ([width, ]) => width)}
      height={useDerivatedVolatile(volatileSize, ([, height]) => height)}
      {...props}
      />
  )
}

const ComputeSize = <C extends ComponentType<any>> (
  { width, height, ...props }:
    ExtractWidthHeightProperties
      & ComponentPropsWithoutExtracted<C>
) => {
  const volatileWidth = useVolatile(width)
  const volatileHeight = useVolatile(height)
  const volatileSize = useDerivatedVolatile(
    [volatileWidth, volatileHeight],
    (width, height) => [width, height]
  )
  return (
    <ExtractSizeImpl
      size={volatileSize}
      width={volatileWidth}
      height={volatileHeight}
      {...props}
      />
  )
}

type ExtractSizeProps <C extends ComponentType<any>> = {
  size?: PotentialVolatile<SizeValueType>
  width?: PotentialVolatile<number>
  height?: PotentialVolatile<number>
} & ComponentProps<C>

const ExtractSize = <C extends ComponentType<any>> (
  { size, width, height, ...props }: ExtractSizeProps<C>
) => (
  size
    ? <ExtractWidthHeight size={size} {...props} />
    : <ComputeSize width={width} height={height} {...props} />
)

type extractPropertiesProps <C extends ComponentType<any>> = (
  ExtractSizeProperty
  | ExtractWidthHeightProperties
) & ComponentPropsWithoutExtracted<C>

/**
 * Creates a component that extracts useful properties and exposes them to the
 * client component through the `_extracted` property, as volatiles.
 * 
 * ```jsx
 * const MyComponent = extractProperties(({ _extracted: { width, height }) => {
 *   // width.current() == 1 && height.current() == 2
 * }
 * ... <MyComponent size={[1, 2]} />
 * ```
 * 
 * Currently supported properties are:
 *  - `size`: {@link SizeValueType}
 *  - `width`: `number` and `height`: `number`
 * 
 * `_extracted` is of type {@link ExtractedProps}.
 * @param Class the client component class
 */
export const extractProperties = (
  <C extends ComponentType<any>>
    (Class: C) =>
      (props: extractPropertiesProps<C>) =>
        <ExtractSize Class={Class} {...props} />
)
