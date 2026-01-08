import React from "react"
import { ThreeElements } from "@react-three/fiber"

import { Component, OuterComponentProps } from "../../motion/Component"


const PrimitiveGroup = (props: ThreeElements["group"]) => <group {...props} />

/**
 * react-three-fiber `<group>` which accepts volatile attributes.
 * See {@link Component} for a list of possible volatile attributes.
 * @param props `<group>` props
 */
export const Group = (props: OuterComponentProps<typeof PrimitiveGroup>) => (
    <Component Class={PrimitiveGroup} {...props} />
)
