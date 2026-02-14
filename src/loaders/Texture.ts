import { CanvasTexture, LinearFilter, Vector2 } from "three"

import { Cache } from "../utils/Cache"
import { PotentialVolatile, ResourceHandle, useDelayedDerivatedVolatile }
  from "../motion/Volatile"
import { SizeValueType } from "../primitives/ValueTypes"
import { useVolatileVector2Size } from "../primitives/Normalizers"


const cache = new Cache<unknown, ResourceHandle<CanvasTexture>>()

/**
 * Returns a volatile texture loaded from the specified image `path` using a
 * `Canvas` element.
 * @param path the path to the image to load
 * @param size the volatile or static size of the canvas
 * @param upscale an optional upscale factor
 * @param cssFilter an optional css `filter` attribute
 * @returns a volatile holding a `CanvasTexture` object
 */
export const useLoadedTextureFromStaticResource = (
  path: string,
  size: PotentialVolatile<SizeValueType>,
  upscale = 1,
  cssFilter = ""
) => (
  useDelayedDerivatedVolatile<
    ResourceHandle<CanvasTexture>,
    Vector2
  > (
    useVolatileVector2Size(size),
    ([width, height], load) => {
      cache.runOnce(
        [path, width, height, upscale, cssFilter],
        load, (set, unset) => {
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context)
            throw new Error("Could not acquire Canvas context.")
          canvas.width = width * upscale
          canvas.height = height * upscale
          const image = new Image()
          image.onload = () => {
            context.filter = cssFilter
            context.drawImage(image, 0, 0, width * upscale, height * upscale)
            set(
              ResourceHandle.create(
                new CanvasTexture(
                  canvas,
                  undefined,
                  undefined,
                  undefined,
                  LinearFilter,
                  LinearFilter,
                  undefined,
                  undefined,
                  undefined
                ),
                (texture) => {
                  unset()
                  texture.dispose()
                }
              )
            )
          }
          image.src = path
        }
      )
    }
  )
)
