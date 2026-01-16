import React, { ReactNode, RefObject, useCallback, useEffect, useRef,
  useImperativeHandle} from "react"
import { Box3 } from "three"
import { extend } from "@react-three/fiber"
import { Text as TroikaText } from "troika-three-text"

import { DefaultFontProfile, FontProfiles, useTheme }
  from "../../configuration/Theme"
import { LocalLayoutClient, useLocalLayoutSettings, useNotifySizeChanged }
  from "../layout/LocalLayout"
import { VolatileAttributeComponent } from "../../motion/Component"
import { useRenderer } from "../rendering/Renderer"
import { useVolatile, Volatile } from "../../motion/Volatile"
import { warn } from "../../logging/Log"
import { inspectRoot } from "../../utils/Debug"


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

  useEffect(() => {
    const onSyncComplete = () => {
      if (!childRef.current)
        return
      if (onResize && childRef.current.geometry.boundingBox)
        onResize(childRef.current.geometry.boundingBox)
      notifySizeChanged()
      invalidate()
    }
    const textObject = childRef.current
    if (!textObject)
      return
    textObject.addEventListener("synccomplete", onSyncComplete)
    return (
      () => textObject.removeEventListener("synccomplete", onSyncComplete)
    )
  }, [onResize])

  // TODO: review this
  useImperativeHandle(ref, () => childRef.current!)

  return (
    <troikaText
      ref={childRef}
      font={theme.fonts[type].path}
      fontSize={theme.fonts[type].size}
      position-z={2}
      text={text}
      maxWidth={bounds.maxInnerWidth}
      textAlign={theme.fonts[type].align}
      color={theme.fonts[type].color}
      fontWeight={theme.fonts[type].weight}
      overflowWrap={"break-word"}
      />
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
