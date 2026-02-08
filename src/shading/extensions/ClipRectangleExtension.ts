import { useMemo } from "react"
import { Box2, Vector2 } from "three"

import { physicalSubviewMatrix, useRenderer }
  from "../../components/rendering/Renderer"
import { ExtensibleShaderMaterial, ShaderMaterialExtension }
  from "../ExtensibleShaderMaterial"
import { PotentialVolatile, useDerivatedVolatile, useVolatile, Volatile }
  from "../../motion/Volatile"


const clipRectangleShaderChunk = /* glsl */`
  #define RC_CLIP_RECTANGLE_EXTENSION 1

  uniform mat3 uRCSubviewMatrix;
  uniform vec2 uRCClipMin;
  uniform vec2 uRCClipMax;

  void RCClipRectangle()
  {
    vec2 p = gl_FragCoord.xy;
    vec2 minP = (uRCSubviewMatrix * vec3(uRCClipMin, 1.0)).xy;
    vec2 maxP = (uRCSubviewMatrix * vec3(uRCClipMax, 1.0)).xy;

    if (p.x < minP.x || p.y < minP.y || p.x > maxP.x || p.y > maxP.y)
      discard;
  }
`

/**
 * Shader material extension which discards pixel that are located outside a
 * specific rectangle.
 * @param bounds a {@link Box2} static or volatile value
 */
export const clipRectangleExtension = (
  material: ExtensibleShaderMaterial,
  { bounds }: { bounds: PotentialVolatile<Box2> }
): Volatile<void> => {
  const uniforms = useMemo(() => ({
    uRCSubviewMatrix: { value: physicalSubviewMatrix },
    uRCClipMin: { value: new Vector2(0, 0) },
    uRCClipMax: { value: new Vector2(0, 0) }
  }), [])
  const { getPixelRatio } = useRenderer()
  const extension = useMemo(() => new ShaderMaterialExtension(
    uniforms,
    undefined,
    clipRectangleShaderChunk
  ), [])
  material.extend(extension)
  return useDerivatedVolatile(
    useVolatile(bounds),
    ({ min, max }: Box2) => {
      const dpr = getPixelRatio()
      uniforms.uRCClipMin.value.set(min.x * dpr, min.y * dpr)
      uniforms.uRCClipMax.value.set(max.x * dpr, max.y * dpr)
      return { }
    },
    [uniforms, getPixelRatio]
  )
}
