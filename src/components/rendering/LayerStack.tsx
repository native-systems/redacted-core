import React, { ComponentType, createContext, ReactNode, useContext, useMemo,
  useRef } from "react"
import { Camera } from "three"

import { createTunnel, type TunnelType } from "../../utils/Tunnel"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"
import { newRenderStepIdentifier, UserInterfaceStage } from "./Stages"


export type LayerIdentifierType = string

type GetTunnelAtCallbackType = (tunnel: TunnelType) => void

interface LayerStackInterface {
  getTunnelAt (
    layerIdentifier: LayerIdentifierType,
    callback: GetTunnelAtCallbackType
  ): void,
  getMainCamera (): Camera | null
}

const LayerStackContext = createContext<LayerStackInterface>(
  NotImplementedProxy("Layer stack context is not available") as
    LayerStackInterface
)

/**
 * Returns an object that can manipulate the layer stack.
 * @returns the layer stack interface
 */
export const useLayerStack = () => useContext(LayerStackContext)

type LayerConfiguration = {
  name: LayerIdentifierType,
  LayerClass: ComponentType<any>
}

export type LayerConfigurationArray = Array<LayerConfiguration>

type LayerStackProps = {
  MainCameraClass: ComponentType<any>
  children: ReactNode
  LayerClasses: LayerConfigurationArray
}

/**
 * Main receiver of 3D and UI objects. This component defines a main "scene" (in
 * the react-three-fiber sense) where 3D objects live and on top of which
 * other layers can be added. Default upper, overlay layers are defined in
 * {@link defaultLayerClasses}. Children can use the {@link UpperLayerTransport}
 * to deport elements to an upper layer.
 * @param props.MainCameraClass the class of the main camera
 * @param props.LayerClasses an array of layer configurations
 */
export const LayerStack = ({
  MainCameraClass,
  children,
  LayerClasses
}: LayerStackProps) => {
  const camera = useRef<Camera>(null)
  const tunnels = useMemo(
    () => Object.fromEntries(
      LayerClasses.map(({ name }) => [name, createTunnel()])
    ),
    []
  )

  const layerStackInterface = useMemo(() => ({
    getTunnelAt: (
      layerIdentifier: LayerIdentifierType,
      callback: GetTunnelAtCallbackType
    ) => callback(tunnels[layerIdentifier]),
    getMainCamera: () => camera.current
  }), [tunnels, camera])

  const layerComponents = useMemo(() => {
    const layers = []
    for (const { name, LayerClass } of LayerClasses) {
      const tunnel = tunnels[name]
      const { start: stageStart, end: stageEnd } = UserInterfaceStage
      let last = undefined
      const renderStepIdentifier = newRenderStepIdentifier(name)
      const renderingSettings = {
        identifier: renderStepIdentifier,
        after: last? [stageStart, last]: [stageStart],
        before: [stageEnd]
      }
      layers.push(
        <LayerClass key={name} renderingSettings={renderingSettings}>
          <tunnel.Out />
        </LayerClass>
      )
      last = renderStepIdentifier
    }
    return layers
  }, [LayerClasses, tunnels])

  return (
    <>
      <MainCameraClass ref={camera} makeDefault />
      <LayerStackContext.Provider value={layerStackInterface}>
        {children}
        {layerComponents}
      </LayerStackContext.Provider>
    </>
  )
}
