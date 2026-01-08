import React, { JSX, useId } from "react"

import { useDOMTunnelInput } from "./InputManager"


/**
 * Hidden `<textarea>` used to receive input and simulate content edition.
 * @param props.ref the reference to the `<textarea>`
 * @param props `<textarea>` properties
 */
export const HiddenTextArea = (
  { ref, ...props }: JSX.IntrinsicElements["textarea"]
) => {
  const DOMTunnelInput = useDOMTunnelInput()

  return (
    <DOMTunnelInput>
      <textarea
        key={useId()}
        ref={ref}
        style={{position: "fixed", left: 0, top: 0, zIndex: -1, opacity: 0}}
        {...props}
        />
    </DOMTunnelInput>
  )
}
