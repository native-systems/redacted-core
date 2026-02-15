import React, { createContext, ReactNode, useContext, useMemo } from "react"
import { Matrix3 } from "three"


/**
 * WebGL renderer-local storage space for material parameters.
 */
export class CommonMaterialValues {
  constructor (
    /**
     * Used by shaders to compute physical (device pixel space) coordinates of
     * objects.
     */
    public physicalSubviewMatrix: Matrix3 = new Matrix3()
  ) { }
}

const CommonMaterialContext = createContext<CommonMaterialValues>(undefined!)

/**
 * Sets up a common material context. Only one should exist per canvas.
 */
export const CommonMaterialValuesProvider = (
  { children }: { children: ReactNode }
) => (
  <CommonMaterialContext.Provider
    value={useMemo(() => new CommonMaterialValues(), [])}
    >
    {children}
  </CommonMaterialContext.Provider>
)

/**
 * Returns the object holding common material values for this canvas. 
 * @returns the {@link CommonMaterialValues} associated with this canvas
 */
export const useCommonMaterialValues = () => useContext(CommonMaterialContext)
