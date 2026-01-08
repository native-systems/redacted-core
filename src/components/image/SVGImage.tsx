import React from "react"

import { ExtractedProps, extractProperties } from "../../utils/Properties"
import { Image } from "./Image"
import { useTheme } from "../../configuration/Theme"
import { useLoadedTextureFromStaticResource } from "../../loaders/Texture"


type SVGImageProps = {
  _extracted: ExtractedProps
  path: string,
  scaleFactor?: number,
  cssFilter?: string
}

/**
 * An {@link Image} component whose texture is loaded from a SVG file.
 * @param props.path the path of the SVG file to load
 * @param props.scaleFactor an optional scale factor to apply (default `8`)
 * @param props.cssFilter an optional CSS filter to apply
 * @param _extracted.size the size of the resulting `Image`
 */
export const SVGImage = extractProperties(
  ({
    _extracted: { size },
    path,
    scaleFactor = 8,
    cssFilter = ""
  }: SVGImageProps) => {
    const { scale, colors: { primary } } = useTheme()
    const texture = useLoadedTextureFromStaticResource(
      path,
      size,
      scale * scaleFactor,
      cssFilter
    )
    return (
      <Image
        size={size}
        texture={texture}
        color={primary}
        transparent
        />
    )
  }
)
