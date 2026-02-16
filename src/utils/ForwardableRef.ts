import { Ref, RefObject, useCallback, useRef } from "react"


// This function was created as a replacement of `useImperativeHandle` which
// failed at propagating a ref value up the component tree
/**
 * Returns a ref which can be both used and forwarded to a parent component.
 * This hook returns a pair whose elements are, in this order, the usable
 * internal ref and a ref callback to be supplied to the target element.
 * ```jsx
 * const [internalRef, assignRef] = useForwardableRef(ref)
 * ...
 * <Element ref={assignRef} />
 * ```
 * @param ref the ref supplied by the parent component, if any
 * @returns a `[internalRef, assignRef]` pair
 */
export const useForwardableRef = 
  <T> (ref?: Ref<T>): [RefObject<T | null>, (value: T) => void] => {
    const internalRef = useRef<T>(null)
    const assignRef = useCallback(
      (value: T) => {
        internalRef.current = value
        if (typeof ref === "function")
          ref(value)
        else if (ref)
          ref.current = value
      },
      [ref]
    )
    return [internalRef, assignRef]
  }
