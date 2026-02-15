import React from "react"
import { Texture } from "three"
import { ThreeElements } from "@react-three/fiber"

import { ExtractedProps, extractProperties } from "../../utils/Properties"
import { VolatileAttributeComponent, Require } from "../../motion/Component"
import { Mesh } from "../base/Mesh"
import { use3DScaleFromSize } from "../../utils/Transform"
import { ResourceHandle, Volatile } from "../../motion/Volatile"


const computeMap =
  (texture: ResourceHandle<Texture>) => ({ map: texture.resource })

const PrimitiveMeshBasicMaterial =
  (props: ThreeElements["meshBasicMaterial"]) => (
    <meshBasicMaterial {...props} />
  )

type ImageProps = {
  _extracted: ExtractedProps,
  texture: Volatile<ResourceHandle<Texture>>
} & Omit<ThreeElements["meshBasicMaterial"], "map" | "ref">

/**
 * A flat plane with the specified size and {@link Texture}.
 * @param texture the texture to display
 * @param _extracted.size the plane size
 * @param props `meshBasicMaterial` properties
 */
export const Image = extractProperties(
  ({ _extracted: { size }, texture, ...props }: ImageProps) => (
    <Require volatile={texture}>
      <Mesh scale={use3DScaleFromSize(size)}>
        <planeGeometry />
        <VolatileAttributeComponent Class={PrimitiveMeshBasicMaterial}
          volatile={texture}
          computeVolatile={computeMap}
          {...props}
          />
      </Mesh>
    </Require>
  )
)
