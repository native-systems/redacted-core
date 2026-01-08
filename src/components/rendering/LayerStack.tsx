import React, { ComponentType, createContext, ReactNode, useContext, useMemo,
  useRef, useState } from "react"
import { Camera } from "three"

import { createTunnel, type TunnelType } from "../../utils/Tunnel"
import { NotImplementedProxy } from "../../utils/NotImplementedProxy"


export type LayerIdentifierType = string

type GetTunnelAtCallbackType = (tunnel: TunnelType) => void

interface LayerStackInterface {
  getTunnelAt (
    layer: LayerIdentifierType,
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
  renderPriority: number
  LayerClass: ComponentType<any>
}

export type LayerConfigurationMap = {
  [name: LayerIdentifierType]: LayerConfiguration
}

type LayerStackProps = {
  MainCameraClass: ComponentType<any>
  children: ReactNode
  LayerClasses: LayerConfigurationMap
}

/**
 * Main receiver of 3D and UI objects. This component defines a main "scene" (in
 * the react-three-fiber sense) where 3D objects live and on top of which
 * other layers can be added. Default upper, overlay layers are defined in
 * {@link defaultLayerClasses}. Children can use the {@link UpperLayerTransport}
 * to deport elements to an upper layer.
 * @param props.MainCameraClass the class of the main camera
 * @param props.LayerClasses an optional object describing the layers
 */
export const LayerStack = ({
  MainCameraClass,
  children,
  LayerClasses
}: LayerStackProps) => {
  const camera = useRef<Camera>(null)
  const [tunnels, setTunnels] = useState<{
    [x: LayerIdentifierType]: TunnelType
  }>({})

  const layerStackInterface = useMemo(() => ({
    getTunnelAt (
      layer: LayerIdentifierType,
      callback: GetTunnelAtCallbackType
    ) {
      if (tunnels[layer])
        callback(tunnels[layer])
      else {
        const tunnel = createTunnel()
        callback(tunnel)
        setTunnels(tunnels => {
          return Object.assign({ [layer]: tunnel }, tunnels)
        })
      }
    },
    getMainCamera: () => camera.current
  }), [tunnels, camera])

  const layerComponents = useMemo(() => Object.keys(tunnels).map(index => {
    const tunnel = tunnels[index]
    const { renderPriority, LayerClass } = LayerClasses[index]
    return (
      <LayerClass key={index} renderPriority={renderPriority}>
        <tunnel.Out />
      </LayerClass>
    )
  }), [tunnels])

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
