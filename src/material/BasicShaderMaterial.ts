import { Color, ColorRepresentation } from "three"

import { ExtensibleShaderMaterial } from "./ExtensibleShaderMaterial"


const basicFragmentShader = /* glsl */ `
  uniform vec3 uRCColor;
  uniform float uRCOpacity;

  void main()
  {
  #ifdef RC_CLIP_RECTANGLE_EXTENSION
    RCClipRectangle();
  #endif
    gl_FragColor = vec4(uRCColor.rgb, uRCOpacity);
  }
`

type BasicShaderMaterialParameters = {
  color?: ColorRepresentation,
  opacity?: number
}

/**
 * Basic extensible shader material.
 */
export class BasicShaderMaterial extends ExtensibleShaderMaterial {
  constructor ({ color, opacity = 1.0 }: BasicShaderMaterialParameters) {
    const colorValue = new Color(color)
    super({
      uniforms: {
        uRCColor: { value: colorValue },
        uRCOpacity: { value: opacity }
      },
      fragmentShader: basicFragmentShader
    })
  }
}
