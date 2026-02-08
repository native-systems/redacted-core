import React, { ReactNode, RefObject, useCallback, useRef, useImperativeHandle,
  useMemo } from "react"
import { Box3, ColorRepresentation } from "three"
import { extend } from "@react-three/fiber"
import { Text as TroikaText } from "troika-three-text"

import { DefaultFontProfile, FontProfiles, useTheme }
  from "../../configuration/Theme"
import { LocalLayoutClient, useLocalLayoutSettings, useNotifySizeChanged }
  from "../layout/LocalLayout"
import { VolatileAttributeComponent } from "../../motion/Component"
import { useRenderer } from "../rendering/Renderer"
import { useVolatile, Volatile }
  from "../../motion/Volatile"
import { warn } from "../../logging/Log"
import { inspectRoot } from "../../utils/Debug"
import { BasicShaderMaterial } from "../../shading/BasicShaderMaterial"
import { ExtendedShaderMaterial }
  from "../../shading/ShaderMaterialExtensionContext"


extend({ TroikaText })

type CommonTextProps = {
  ref?: RefObject<TroikaText | null>
  type?: FontProfiles
  onResize?: (size: Box3) => void
}

const TextBase = (
  { ref, type = DefaultFontProfile, text, onResize }:
    CommonTextProps & { text: string }
) => {
  const childRef = useRef<TroikaText>(null)
  const theme = useTheme()
  const bounds = useLocalLayoutSettings()
  const notifySizeChanged = useNotifySizeChanged()
  const { invalidate } = useRenderer()

  const material = useMemo(
    () => new BasicShaderMaterial({ color: theme.fonts[type].color }),
    [theme]
  )

  const onSyncComplete = useCallback(() => {
    if (!childRef.current)
      return
    if (onResize && childRef.current.geometry.boundingBox)
      onResize(childRef.current.geometry.boundingBox)
    notifySizeChanged()
    invalidate()
  }, [invalidate, notifySizeChanged])

  const bindRef = useCallback((textObject: TroikaText) => {
    if (textObject) {
      childRef.current = textObject
      textObject.addEventListener("synccomplete", onSyncComplete)
    }
    else {
      childRef.current?.removeEventListener("synccomplete", onSyncComplete)
      childRef.current = null
    }
  }, [])

  // TODO: review this
  useImperativeHandle(ref, () => childRef.current!)

  return (
    <troikaText
      ref={bindRef}
      font={theme.fonts[type].path}
      fontSize={theme.fonts[type].size}
      position-z={2}
      text={text}
      maxWidth={bounds.maxInnerWidth}
      textAlign={theme.fonts[type].align}
      fontWeight={theme.fonts[type].weight}
      overflowWrap={"break-word"}
      >
      <ExtendedShaderMaterial material={material} />
    </troikaText>
  )
}

const VolatileText = (
  { type = DefaultFontProfile, text, ...props }:
    CommonTextProps & { text: Volatile<string> }
) => {
  const theme = useTheme()

  const computeText = useCallback((text: string, textObject?: TroikaText) => {
    const transformedText = theme.fonts[type].transform
      ? theme.fonts[type].transform(text)
      : text
    if (!textObject)
      return { text: transformedText }
    textObject.text = transformedText
    textObject.sync()
  }, [theme, type])

  return (
    <VolatileAttributeComponent Class={TextBase}
      volatile={text}
      computeVolatile={computeText}
      type={type}
      {...props}
      />
  )
}

const StaticText = (
  { children, ...props }: CommonTextProps & { children: ReactNode }
) => {
  __DEBUG_STATEMENT__: {
    if (typeof children !== "string" && typeof children !== "number") {
      warn("Text child is not a string or number")
      inspectRoot().StaticText_children = children
    }
  }
  const text = useVolatile(children?.toString())
  return <VolatileText text={text} {...props} />
}

export type TextProps = {
  children: ReactNode
  text?: Volatile<string>
  height?: number
} & CommonTextProps

/**
 * A text block that wraps automatically. The component can use a volatile
 * `text` string property or a static text passed as a child.
 * @param props.type an optional font profile name (default `normal`)
 * @param props.text an optional volatile string
 * @param props.height an optional maximum height
 * @param props.onResize an optional function called after the text resized
 */
export const Text = (
  { type = DefaultFontProfile, text, height, ...props }: TextProps
) => {
  const bounds = useLocalLayoutSettings()

  const textComponent = text
    ? <VolatileText type={type} text={text} {...props} />
    : <StaticText type={type} {...props} />

  return (
    <LocalLayoutClient
      marginLeft={bounds.paddingLeft}
      marginRight={bounds.paddingRight}
      marginTop={bounds.paddingTop}
      marginBottom={bounds.paddingBottom}
      height={height}
      >
      {textComponent}
    </LocalLayoutClient>
  )
}
