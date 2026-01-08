import React, { ReactElement, useLayoutEffect, useState } from "react"

import { useLayerStack, LayerIdentifierType } from "./LayerStack"
import { TunnelType } from "../../utils/Tunnel"
import { error } from "../../logging/Log"


type UpperLayerTransportProps = {
  layer: LayerIdentifierType,
  children: ReactElement
}

/**
 * Deports `children` to the specified layer. `children` must be a React element
 * with a `key` property.
 * @param props.layer the layer identifier
 */
export function UpperLayerTransport(
  { layer, children }: UpperLayerTransportProps
) {
  const { getTunnelAt } = useLayerStack()
  const [tunnel, setTunnel] = useState<TunnelType>()

  __DEBUG__STATEMENT__: {
    if (!layer)
      error("Layer was not specified in UpperLayerTransport")
    if (!children.key)
      error("UpperLayerTransport child must have a key")
  }

  useLayoutEffect(() => getTunnelAt(layer, (tunnel) => setTunnel(tunnel)))

  return !tunnel? <></>: <tunnel.In>{children}</tunnel.In>
}
