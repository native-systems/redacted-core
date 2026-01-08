import { useRef } from "react"
import { Object3D } from "three"

import { useRegisteredBoundingBox } from "./BoundingBox"


/**
 * Hook that creates a ref object that can be assigned to a trackable object.
 * @param initialValue the initial value
 * @returns the ref object
 */
export const useTrackableObjectRef = 
  (initialValue: Object3D | null = null) => {
    const ref = useRef<Object3D>(initialValue)
    
    useRegisteredBoundingBox(ref)

    return ref
  }
