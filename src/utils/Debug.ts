import { debug, warn } from "../logging/Log"

import { Volatile, useDerivatedVolatile, useVolatile } from "../motion/Volatile"


const INSPECT_ROOT_KEY = "__redacted_core_debug__" as const

/**
 * Returns an object which can be used to store values for debugging purposes.
 * The object is available in `window` with key {@link INSPECT_ROOT_KEY} for
 * later inspection.
 * @returns the object containing values to inspect
 */
export const inspectRoot = () => {
  __DEBUG_STATEMENT__: {
    type ExtendedWindow = { [INSPECT_ROOT_KEY]: { [_: string]: any } }
    const extendedWindow = window as unknown as ExtendedWindow
    if (!Object.keys(extendedWindow).includes(INSPECT_ROOT_KEY))
      extendedWindow[INSPECT_ROOT_KEY] = new Proxy(window, {
        set(_object, property, _value) {
          debug(`New inspectable object created with key '${String(property)}'`)
          return true
        }
      }) 
    return extendedWindow[INSPECT_ROOT_KEY]
  }
  return {}
}

/**
 * Outputs a warning message whenever a volatile switched back to being not
 * ready.
 * @param volatile the volatile to watch
 * @param warningMessage the warning message to display
 * @returns the input volatile
 */
export const useVolatileReadinessCheck = <T> (
  volatile: Volatile<T>,
  warningMessage: string
): Volatile<T> => {
  const volatileReady = useVolatile(volatile.ready())
  const derivatedVolatile = useDerivatedVolatile(volatile, (value) => {
    volatileReady.set(true)
    return value
  })
  if (volatileReady.ready() && volatileReady.current() && !volatile.ready())
    warn(warningMessage)
  return derivatedVolatile
}
