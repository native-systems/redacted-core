// https://github.com/protectwise/troika/issues/214#issuecomment-1867037294

declare module "troika-three-text" {
  import type { BufferGeometry, Color, Material } from "three"
  import { ReactNode } from "react"
  import { Object3D } from "three"

  export class Text extends Object3D {
    constructor ()

    text: string
    fontSize: number
    font: string
    color: string | number | Material
    maxWidth: number
    lineHeight: number
    letterSpacing: number
    textAlign: 'left' | 'right' | 'center' | 'justify'
    material: Material
    anchorX: 'left' | 'center' | 'right' | number
    anchorY: 'top' | 'middle' | 'bottom' | 'baseline' | number
    clipRect: [number, number, number, number]
    depthOffset: number
    direction: 'auto' | 'ltr' | 'rtl'
    overflowWrap: 'normal' | 'break-word'
    whiteSpace: 'normal' | 'nowrap'
    outlineWidth: number
    outlineOffsetX: number
    outlineOffsetY: number
    outlineColor: string | number
    outlineOpacity: number
    strokeWidth: number
    strokeColor: string | number | Color
    strokeOpacity: number
    curveRadius: number
    fillOpacity: number
    fontStyle: 'normal' | 'italic'
    fontWeight: 'normal' | 'bold'
    glyphGeometryDetail: number
    gpuAccelerateSDF: boolean
    outlineBlur: number
    sdfGlyphSize: number
    textIndent: number
    unicodeFontsUrl: string
    geometry: BufferGeometry
    sync: () => void
    dispose(): void
  }

  // Properties of `<troikaText>` element
  export interface TroikaElements {
    troikaText: {
      ref: RefObject<Text>
      children: ReactNode
    } & Omit<Partial<Text>, "children">
  }
}

declare global {
  import type { TroikaElements } from "troika-three-text"

  // Declare element `<troikaText>`
  declare module "react" {
    namespace JSX {
      interface IntrinsicElements extends TroikaElements {}
    }
  }

  declare module "react/jsx-runtime" {
    namespace JSX {
      interface IntrinsicElements extends TroikaElements {}
    }
  }

  declare module "react/jsx-dev-runtime" {
    namespace JSX {
      interface IntrinsicElements extends TroikaElements {}
    }
  }

  // Declare event `synccomplete`
  declare module "three" {
    interface Object3DEventMap {
      synccomplete: {}
    }
  }
}
