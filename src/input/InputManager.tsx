// SPDX-FileCopyrightText: 2025-2026 Native Systems
// SPDX-License-Identifier: Apache-2.0

import React, { ComponentType, createContext, ReactNode, useCallback,
    useContext, useEffect, useMemo } from 'react'

import { createTunnel, TunnelType } from '../utils/Tunnel'


const DOMTunnelInputContext = createContext<ComponentType<any>>(undefined!)

export const useDOMTunnelInput = () => useContext(DOMTunnelInputContext)

type Event = any

export type EventCallback = (e: Event) => void

export interface PointerEventHandlers {
  onPointerEnter: EventCallback
  onPointerLeave: EventCallback
}

interface PointerEventManagerInterface {
  getEventHandlers (
    onFocus: EventCallback,
    onBlur: EventCallback
  ): PointerEventHandlers
}

const PointerEventManagerContext =
  createContext<PointerEventManagerInterface>(undefined!)

export const usePointerEventHandlers = (
  onFocus: EventCallback,
  onBlur: EventCallback
) => {
  const { getEventHandlers } = useContext(PointerEventManagerContext)
  return useMemo(() => getEventHandlers(onFocus, onBlur), [onFocus, onBlur])
}

const POINTER_EVENTS = ["click", "pointerdown", "pointerup"]

const PointerInputManager = ({ children }: { children: ReactNode }) => {
  // TODO: implement pointer events

  const pointerHandler = useCallback((e: Event) => {
    e.preventDefault()
  }, [])

  useEffect(() => {
    POINTER_EVENTS.forEach(
      (eventName) => document.body.addEventListener(
        eventName,
        pointerHandler,
        true
      )
    )
    return () => {
      POINTER_EVENTS.forEach(
        (eventName) => document.body.removeEventListener(
          eventName,
          pointerHandler,
          true
        )
      )
    }
  }, [pointerHandler])

  const pointerEventManagerInterface: PointerEventManagerInterface = useMemo(
    () => ({
      getEventHandlers: (onFocus, onBlur) => ({
        onPointerEnter (e) {
          if (onFocus) onFocus(e)
        },
        onPointerLeave (e) {
          if (onBlur) onBlur(e)
        }
      }) 
    }),
    []
  )

  return (
    <PointerEventManagerContext.Provider value={pointerEventManagerInterface}>
      {children}
    </PointerEventManagerContext.Provider>
  )
}

const KeyboardInputManager = () => {
  // TODO: implement key bindings and UI controls
  return <></>
}

const LockableArea = (
  { DOMTunnel, children }: { DOMTunnel: TunnelType, children: ReactNode }
) => {
  return (
    <>
      <DOMTunnelInputContext.Provider value={DOMTunnel.In}>
        <PointerInputManager>
          {children}
        </PointerInputManager>
      </DOMTunnelInputContext.Provider>
      <KeyboardInputManager />
    </>
  )
}

/**
 * Manages keyboard, mouse input and DOM tunnel.
 */
export const InputManager = () => {
  const DOMTunnel = createTunnel()

  return {
    CaptureArea: ({ children }: { children: ReactNode }) => (
      <>
        <DOMTunnel.Out />
        <LockableArea DOMTunnel={DOMTunnel} >
          {children}
        </LockableArea>
      </>
    )
  }
}
