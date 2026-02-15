import React from "react"
import { Vector2, Vector3 } from "three"

import { useDerivatedVolatile, useVolatile } from "../../motion/Volatile"
import { useComputedBounds } from "../layout/LocalLayout"
import { FocusArea, FocusAreaEventHandlers } from "./FocusArea"
import { useLayer } from "../rendering/Layer"


type LocalFocusAreaProps = FocusAreaEventHandlers

/**
 * A {@link FocusArea} which automatically aligns itself with the current local
 * layout client.
 * @param props.onFocus an optional callback which will receive focus events
 * @param props.onBlur an optional callback which will receive blurring events
 */
export const LocalFocusArea = (props: LocalFocusAreaProps) => {
  const { RootTunnel } = useLayer()
  const computedBounds = useVolatile(useComputedBounds())

  let size = new Vector2()

  const volatileSize = useDerivatedVolatile(computedBounds, (bounds) => {
    bounds.getSize(size)
    return size
  })

  const volatilePosition = useDerivatedVolatile(
    [computedBounds, volatileSize],
    ({ min }, [width, height]) => (
      new Vector3(min.x + width / 2, min.y + height / 2, 0)
    )
  )

  return (
    <RootTunnel>
      <FocusArea
        position={volatilePosition}
        size={volatileSize}
        {...props}
        />
    </RootTunnel>
  )
}
