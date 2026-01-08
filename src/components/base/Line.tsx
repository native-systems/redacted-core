import React, { useCallback, useEffect, useRef, Ref, RefObject } from "react"
import { extend, ThreeElements } from "@react-three/fiber"
import { Line as ThreeLine, BufferGeometry, LineBasicMaterial } from "three"

import { VolatileAttributeComponent } from "../../motion/Component"
import { Volatile } from "../../motion/Volatile"


// `threeLine` is declared in `JSX.InstrinsicElements` but not recognized. We
// use this instead of `line` since the compiler confuses it with the SVG
// element
extend({ ThreeLine: ThreeLine })

export { ThreeLine }

type BasicLineProps = {
  ref?: Ref<ThreeLine>
  positionBuffer: Float32Array<ArrayBuffer>
} & ThreeElements["lineBasicMaterial"]

const BasicLine = ({ ref, positionBuffer, ...props }: BasicLineProps) => {
  const geometry = useRef<BufferGeometry>(null)
  const material = useRef<LineBasicMaterial>(null)

  useEffect(() => () => {
    geometry.current?.dispose()
    material.current?.dispose()
  }, [])

  return (
    <threeLine ref={ref}>
      <bufferGeometry ref={geometry}>
        <bufferAttribute
          attach="attributes-position"
          args={[positionBuffer, 3, false]}
          /> 
      </bufferGeometry>
      <lineBasicMaterial ref={material} {...props} />
    </threeLine>
  )
}

export type LineStaticProps = {
  ref?: RefObject<ThreeLine| null>
} & ThreeElements["lineBasicMaterial"]

export type LineProps<S> = {
  volatile: Volatile<S>,
  computePoints: (value: S) => number[][],
} & LineStaticProps

/**
 * react-three-fiber `<line>` which accepts a volatile list of points.
 * @param props.volatile the volatile array of `[x, y, z]` points
 * @param props other `lineBasicMaterial` props
 */
export const Line = <S,> (props: LineProps<S>) => {
  // TODO: Investigate the relevance of having a per-layer line "merger" to
  // reduce write calls to GPU memory
  const { ref, volatile, computePoints, ...lineProps } = props
  const computePositions = useCallback(
    (value: S, line?: ThreeLine) => {
      if (!line)
        return {
          positionBuffer: new Float32Array([...computePoints(value).flat()])
        }
      const positionAttribute = line.geometry.getAttribute("position")
      computePoints(value).forEach(([x, y, z], i) => {
        positionAttribute.setXYZ(i, x, y, z)
      })
      positionAttribute.needsUpdate = true
      // Seems like a wrong buffer may render correctly on the screen but make
      // the computations of the bounding box and sphere fail silently, which in
      // turn messes up the render order (computed z-order is NaN).
      // TODO: find a way to detect those kinds of bugs
      line.geometry.computeBoundingSphere()
    },
    [computePoints]
  )

  return (
    // This custom implementation replaces the original Drei's Line which
    // triggered a catastrophic VRAM leak
    <VolatileAttributeComponent Class={BasicLine}
      volatile={volatile}
      computeVolatile={computePositions}
      ref={ref}
      {...lineProps}
      />
  )
}
