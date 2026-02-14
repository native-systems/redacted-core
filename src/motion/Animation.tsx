import React, { useEffect, useId, useRef } from "react"
import { Vector2, Vector3 } from "three"

import { RootVolatile, useDerivatedVolatile, Volatile } from "./Volatile"
import { useRenderer } from "../components/rendering"
import { Vector2ConstructorExtended, Vector3ConstructorExtended,
  Vector3ConstructorSingleParameterTypes } from "../primitives/Constructors"
import { SizeValueType } from "../primitives/ValueTypes"
import { use3DScale } from "../utils/Transform"


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

const useAnimatedLinearVector3 = (
  vector: Volatile<Vector3ConstructorSingleParameterTypes>,
  speed: number
): Volatile<Vector3> => {
  const [startAnimation, stopAnimation] = useAnimation()
  const getNow = useClock()
  const active = useRef(false)
  const lastUpdate = useRef(getNow())
  const currentVector = useRef<Vector3>(null)
  useEffect(() => () => void stopAnimation(), [])
  return useDerivatedVolatile([vector, animationSignal], (value, _) => {
    const targetPosition = Vector3ConstructorExtended.create(value)
    const now = getNow()
    if (!active.current)
      lastUpdate.current = now
    if (!currentVector.current)
      currentVector.current = new Vector3ConstructorExtended(targetPosition)
    if (currentVector.current.equals(targetPosition)) {
      stopAnimation()
      active.current = false
    } else {
      startAnimation()
      active.current = true
    }
    const nextVector = !isFinite(currentVector.current.length())
      ? targetPosition
      : currentVector.current.add(
        targetPosition.sub(currentVector.current).clampLength(
          0,
          speed * (now - lastUpdate.current)
        )
      )
    currentVector.current = nextVector
    lastUpdate.current = now
    return new Vector3(nextVector.x, nextVector.y, nextVector.z)
  }, [speed])
}

/**
 * Derives a volatile position which converges to the target at maximum `speed` 
 * spatial units per second.
 * @param position the target position volatile
 * @param speed the position rate of change
 * @returns the derived position volatile
 */
export const useAnimatedPosition = (
  position: Volatile<Vector3ConstructorSingleParameterTypes>,
  speed: number
): Volatile<Vector3> => (
  useAnimatedLinearVector3(position, speed)
)

/**
 * Derives a volatile scale which converges to the target at maximum `speed`
 * spatial units per second.
 * @param scale the target scale volatile
 * @param speed the scale rate of change
 * @returns the derived scale volatile
 */
export const useAnimatedScale = (
  scale: Volatile<Vector3ConstructorSingleParameterTypes>,
  speed: number
): Volatile<Vector3> => (
  useAnimatedLinearVector3(scale, speed)
)

/**
 * Derives a volatile size which converges to the target at maximum `speed`
 * spatial units per second.
 * @param size the target scale volatile
 * @param speed the scale rate of change
 * @returns the derived scale volatile
 */
export const useAnimatedSize = (
  size: Volatile<SizeValueType>,
  speed: number
): Volatile<Vector2> => (
  useDerivatedVolatile(
    useAnimatedLinearVector3(use3DScale(size), speed),
    ([width, height, _]) => new Vector2ConstructorExtended(width, height)
  )
)

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
