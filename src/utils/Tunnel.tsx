import React, { ReactElement, useLayoutEffect } from 'react'
import { create } from 'zustand'

import { warn } from '../logging/Log'

interface StoreType  {
  current: ReactElement[],
  version: number,
  set: (callback: (set: StoreType) => object) => void
}

/* Shamelessly stolen from pmndrs/tunnel-rat */
export const createTunnel = () => {
  const useStore = create<StoreType>((set) => ({
    current: [],
    version: 0,
    set,
  }))

  return {
    In: ({ children }: { children: ReactElement }) => {
      const set = useStore((state) => state.set)
      const version = useStore((state) => state.version)

      /* When this component mounts, we increase the store's version number.
      This will cause all existing rats to re-render (just like if the Out
      component were mapping items to a list.) The re-rendering will cause the
      final order of rendered components to match what the user is expecting. */
      useLayoutEffect(() => {
        set((state) => ({
          version: state.version + 1,
        }))
      }, [set])

      /* Any time the children _or_ the store's version number change, insert
      the specified React children into the list of rats. */
      useLayoutEffect(() => {
      set(({ current }) => {
        return {
        current: [...current, children]
        }
      })

      return () =>
        set(({ current }) => {
        return {
          current: current.filter((c) => c !== children),
        }
        })
      }, [set, children, version])

      return null
    },

    Out: () => {
      const current = useStore((state) => state.current)
      /* According to the official React documentation, when rendering multiple
      objects of the same type into the same container, we should specify a
      local key to help the reconcilier make sense of which object was which in
      the previous commit. However, when a tunnel in is rerendered, its children
      can be reordered in the out component. This triggers a strange bug where
      React (or the R3F reconcilier ?) duplicates the children. Ensuring the
      same output order seems to fix that issue. */
      const sorted = current.sort((a, b) => {
        if (!a.key || !b.key) {
          warn("Missing key in tunnel client")
          return 0
        }
        return b.key.localeCompare(a.key)
      })
      return <>{sorted}</>
    },
  }
}

export type TunnelType = ReturnType<typeof createTunnel>
