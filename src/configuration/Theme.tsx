import React, { createContext, ReactNode, useContext, useMemo } from "react"
import _ from "lodash"

import { NotImplementedProxy } from "../utils/NotImplementedProxy"


interface FontConfiguration {
  path: string
  size: number
  weight?: "normal" | "bold"
  align?: "left" | "right"
  color?: string
  wordBreak?: string
  transform?: (text: string) => string
}

interface BoxConfiguration {
  width: number
  backgroundColor: string
  backgroundOpacity: number
  horizontalBorder: number
  verticalBorder: number
  borderColor: string
  borderOpacity: number
}

export type ColorProfiles = "primary"

export const DefaultFontProfile = "normal" as const

export type FontProfiles =
  typeof DefaultFontProfile | "italic" | "sectionHeader"

export interface ThemeConfiguration {
  scale: number
  box: BoxConfiguration
  colors: { [ K in ColorProfiles]: string}
  fonts: { [K in FontProfiles]: FontConfiguration }

}

const ThemeContext = createContext(
  NotImplementedProxy("No theme defined") as ThemeConfiguration
)

/**
 * Exposes a theme configuration to the `children` subtree.
 * @param props.theme the theme configuration object
 * @param props.children classic React children
 */
export const ThemeProvider = (
  { theme, children } : { theme: ThemeConfiguration, children: ReactNode }
) => (
  <ThemeContext.Provider value={theme}>
    {children}
  </ThemeContext.Provider>
)

/**
 * Hook that returns the current theme configuration.
 * @returns a {@link ThemeConfiguration} object with UI-related settings
 */
export const useTheme = () => useContext(ThemeContext)

type OverrideThemeProps = {
  children: ReactNode
  path: string
  [key: string]: any
}

// TODO: re-evaluate the relevance of that thing
/**
 * Overrides the theme for a part of the component tree. Children of this
 * component will receive a partially modified theme configuration. The `path`
 * property specifies which sub-object should be overriden, e.g. `fonts.normal`.
 * Other property names must match that object keys. Omitted properties and
 * other sub-objects are inherited from the parent theme.
 * @param props.path the path to the object whose properties should be set
 * @param props the properties to set on the object
 */
export const OverrideTheme = (
  { children, path=".", ...overrideSettings }: OverrideThemeProps
) => {
  const theme = useTheme()
  const overridedTheme = useMemo(
    () => {
      const clonedTheme = _.cloneDeepWith(theme)
      return _.set(
        clonedTheme,
        path,
        { ..._.get(clonedTheme, path), ...overrideSettings }
      )
    },
    [theme, path, overrideSettings]
  )
  return (
    <ThemeContext.Provider value={overridedTheme}>
      {children}
    </ThemeContext.Provider>
  )
}
