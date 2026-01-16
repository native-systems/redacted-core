import React, { useEffect, useId, useRef } from "react"

import { RootVolatile, useDerivatedVolatile, Volatile } from "./Volatile"
import { useRenderer } from "../components/rendering"
import { Vector3ConstructorSingleParameterTypes, Vector3, ThreeVector3 }
  from "../primitives/Vector3"


const currentAnimatedTargets = new Set()

const useClock = () => () => window.performance.now() / 1000

// This signal is set before each animation-triggered render and is used to
// ensure that animation values are invalidated even when their actual source
// is not. Targets may stay registered indefinitely otherwise.
const animationSignal = new RootVolatile(1)

const useAnimation = () => {
  const id = useId()
  return [
    () => currentAnimatedTargets.add(id),
    () => currentAnimatedTargets.delete(id)
  ]
}

/**
 * Derives a volatile position which follows the target at maximum `speed` 
 * spatial units per second.
 * @param position the target position volatile
 * @param speed the derived position speed
 * @returns the derived position volatile
 */
export const useAnimatedPosition = (
  position: Volatile<Vector3ConstructorSingleParameterTypes>,
  speed: number
): Volatile<ThreeVector3> => {
  const [startAnimation, stopAnimation] = useAnimation()
  const getNow = useClock()
  const active = useRef(false)
  const lastUpdate = useRef(getNow())
  const currentPosition = useRef<Vector3>(null)
  useEffect(() => () => void stopAnimation(), [])
  return useDerivatedVolatile([position, animationSignal], (value, _) => {
    const targetPosition = Vector3.create(value)
    const now = getNow()
    if (!active.current)
      lastUpdate.current = now
    if (!currentPosition.current)
      currentPosition.current = new Vector3(targetPosition)
    if (currentPosition.current.equals(targetPosition)) {
      stopAnimation()
      active.current = false
    } else {
      startAnimation()
      active.current = true
    }
    const nextPosition = !isFinite(currentPosition.current.length())
      ? targetPosition
      : currentPosition.current.add(
        targetPosition.sub(currentPosition.current).clampLength(
          0,
          speed * (now - lastUpdate.current)
        )
      )
    currentPosition.current = nextPosition
    lastUpdate.current = now
    return new ThreeVector3(nextPosition.x, nextPosition.y, nextPosition.z)
  }, [speed])
}

export const AnimationHandler = () => {
  const { invalidate } = useRenderer()

  useEffect(() => {
    const interval = setInterval(
      () => {
        if (currentAnimatedTargets.size) {
          animationSignal.set(1)
          invalidate()
        }
      },
      // TODO: check how to retrieve the screen frame rate
      16
    )
    return () => clearInterval(interval)
  })

  return <></>
}
