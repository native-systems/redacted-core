import React, { ComponentType } from "react"
import { Flex as R3Flex, Box as R3Box, FlexProps as R3FlexProps,
  BoxProps as R3BoxProps } from "@react-three/flex"


const UntypedFlex: ComponentType<any> = R3Flex

type ClonedFlexProperties = "ref" | "children" | "onReflow"

type FlexProps = {
  [K in ClonedFlexProperties]?: R3FlexProps[K]
}

export const Flex = (props: FlexProps) => <UntypedFlex {...props} />

const UntypedBox: ComponentType<any> = R3Box

type ClonedBoxProperties =
  "ref" | "children" | "width" | "height" | "marginTop" | "marginLeft"

type BoxProps = {
  [K in ClonedBoxProperties]?: R3BoxProps[K]
}

export const Box = (props: BoxProps) => <UntypedBox {...props} />
