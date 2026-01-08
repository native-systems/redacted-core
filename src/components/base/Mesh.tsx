import React from "react"
import { ThreeElements } from "@react-three/fiber"

import { Component, OuterComponentProps } from "../../motion/Component"


const PrimitiveMesh = (props: ThreeElements["mesh"]) => <mesh {...props} />

/**
 * react-three-fiber `<mesh>` which accepts volatile attributes.
 * See {@link Component} for a list of possible volatile attributes.
 * @param props `<mesh>` props
 */
export const Mesh = (props: OuterComponentProps<typeof PrimitiveMesh>) => (
  <Component Class={PrimitiveMesh} {...props} />
)
