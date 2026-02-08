import React, { ComponentType, createContext, ReactNode, RefObject, useContext,
  useMemo } from "react"
import { Box2 } from "three"

import { PotentialVolatile, Volatile } from "../../motion/Volatile"
import { useRenderer } from "../../components/rendering"
import { warn } from "../../logging/Log"


export interface LocalLayoutClientContainer {
  computedBounds: Volatile<Box2>
}

export interface LocalLayoutClientContainerProps {
  ref?: RefObject<LocalLayoutClientContainer | null>
  children?: ReactNode
  width?: number
  height?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number
}

interface LocalLayoutSettingsInterface {
  disabled: boolean
  paddingLeft: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  maxInnerWidth?: number
  maxInnerHeight?: number
  maxOuterWidth?: number
  maxOuterHeight?: number
}

interface LocalLayoutInterface {
  clientWrapperClass?: ComponentType<LocalLayoutClientContainerProps>
  settings: LocalLayoutSettingsInterface
  notifySizeChanged: () => void
  computedBounds?: Volatile<Box2>
}

const defaultLocalLayout = {
  clientWrapperClass: undefined,
  settings: {
    disabled: false,
    paddingLeft: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    maxInnerWidth: undefined,
    maxInnerHeight: undefined,
    maxOuterWidth: undefined,
    maxOuterHeight: undefined
  },
  notifySizeChanged: () => undefined,
  computedBounds: undefined
}

const LocalLayoutContext =
  createContext<LocalLayoutInterface>(defaultLocalLayout)

/**
 * Returns the current local layout settings. Components should use these
 * settings to determine their elements' positions and sizes.
 * @returns an object containing size and margin information
 */
export const useLocalLayoutSettings =
  () => useContext(LocalLayoutContext).settings

/**
 * Returns a callback function which can be called to notify the local layout
 * manager that a client child's dimensions have changed.
 * @returns the current size changed notification function
 */
export const useNotifySizeChanged =
  () => useContext(LocalLayoutContext).notifySizeChanged

/**
 * Returns the allowed bounds for the current local layout client.
 * @returns a {@link Box2} volatile or static value
 */
export const useComputedBounds = (): PotentialVolatile<Box2> => {
  const { bounds } = useRenderer()
  const computedBounds = useContext(LocalLayoutContext).computedBounds
  __DEBUG_STATEMENT__: {
    if (!computedBounds)
      warn("Local layout computed bounds are not available.")
  }
  return computedBounds || bounds
}

const defaultClientWrapperClass =
  ({ children }: { children?: ReactNode }) => <>{children}</>

type LocalLayoutProps = {
  children: ReactNode
  clientWrapperClass?: ComponentType<LocalLayoutClientContainerProps>
  notifySizeChanged?: () => void
  computedBounds?: Volatile<Box2>
  reset?: boolean
} & Partial<LocalLayoutSettingsInterface>

/**
 * Defines a local layout. Children of this component will be given those
 * settings on demand. Unspecified settings will be inherited. Local layout
 * clients will be wrapped into a `clientWrapperClass` if specified.
 * @param props.clientWrapperClass an optional local layout client wrapper
 * @param props.reset if `true`, uses the default settings
 * @param props.notifySizeChanged an optional callback to handle client resize
 * @param props optional override settings
 */
export const LocalLayout = (props: LocalLayoutProps) => {
  const inheritedClientWrapperClass = 
    useContext(LocalLayoutContext).clientWrapperClass
  const {
    clientWrapperClass = (
      inheritedClientWrapperClass || defaultClientWrapperClass
    ),
    notifySizeChanged = () => undefined,
    computedBounds = undefined,
    reset = false,
    children,
    ...overrideSettings
  } = props
  const inheritedSettings = reset
    ? defaultLocalLayout.settings
    : useLocalLayoutSettings()
  const localLayout = useMemo(
    () => ({
      clientWrapperClass: reset? defaultClientWrapperClass: clientWrapperClass,
      settings: {...inheritedSettings, ...overrideSettings},
      notifySizeChanged,
      computedBounds
    }),
    [
      clientWrapperClass,
      notifySizeChanged,
      computedBounds,
      reset,
      inheritedSettings,
      overrideSettings
    ]
  )
  return (
    <LocalLayoutContext.Provider value={localLayout}>
      {children}
    </LocalLayoutContext.Provider>
  )
}

/**
 * Declares a local layout client. Children of this component will be wrapped
 * into a positioning component set up by the local layout manager. Size and
 * margins can be specified through the properties.
 * @param props optional instance-specific size and margin overrides
 */
export const LocalLayoutClient = (props: LocalLayoutClientContainerProps) => {
  const ClientWrapperClass = useContext(LocalLayoutContext).clientWrapperClass!
  const localLayoutSettings = useLocalLayoutSettings()
  if (localLayoutSettings.disabled)
    return <ClientWrapperClass />
  return <ClientWrapperClass {...props} />
}

/**
 * Disables the rendering of local layout clients which are children of this
 * component. Children are entirely removed from the vDOM, but an empty
 * {@link LocalLayoutClient} remains. It acts like a placeholder for layout
 * components which have trouble handling dynamic addition and removal of
 * children.
 * @param props.active renders children if `true`
 */
export const Optional = (
  { active, children }: { active: boolean, children: ReactNode }
) => (
  <LocalLayout disabled={!active}>
    {children}
  </LocalLayout>
)
