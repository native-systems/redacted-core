import React, { createContext, ReactNode, useContext, useMemo } from "react"

import { ExtensibleShaderMaterial } from "./ExtensibleShaderMaterial"
import { Resolve } from "../motion/Component"
import { Volatile } from "../motion/Volatile"


class InjectedExtension {
  constructor (
    public useUpdate: (
      material: ExtensibleShaderMaterial,
      parameters: any
    ) => Volatile<void>,
    public parameters: any
  ) { }
}

const ExtensionSetContext = createContext<InjectedExtension[]>([])

type ShaderMaterialExtensionContextProps <P> = {
  children: ReactNode
  extension: (
    material: ExtensibleShaderMaterial,
    parameters: P
  ) => Volatile<void>
} & P

/**
 * Provides shader material extension context for children that declare an
 * {@link ExtendedShaderMaterial}. The `extension` property is a function which
 * accepts an arbitrary parameter object and returns a symbol volatile.
 * This function is executed as a React hook in the extended shader material.
 * @param props.extension the shader material extension hook
 * @param props additionnal extension parameters
 */
export const ShaderMaterialExtensionContext = <P,> (
  { children, extension, ...parameters }: ShaderMaterialExtensionContextProps<P>
) => {
  const inheritedExtensions = useContext(ExtensionSetContext)
  const allExtensions = useMemo(
    () => [
      ...inheritedExtensions,
      new InjectedExtension(extension, parameters as P)
    ], 
    [inheritedExtensions, extension]
  )
  return (
    <ExtensionSetContext.Provider value={allExtensions}>
      {children}
    </ExtensionSetContext.Provider>
  )
}

type IntermediateExtendedShaderMaterialProps = {
  material: ExtensibleShaderMaterial
  extensions: InjectedExtension[]
}

const IntermediateShaderMaterialBinder = (
  { material, extension }:
    { material: ExtensibleShaderMaterial, extension: InjectedExtension }
) => {
  const symbol = extension.useUpdate(material, extension.parameters)
  return <Resolve volatile={symbol} />
}

const IntermediateShaderMaterial = (
  { material, extensions }: IntermediateExtendedShaderMaterialProps
) => {
  const nextExtensions = useMemo(() => extensions.slice(1), extensions)
  if (extensions.length)
    return (
      <>
        <IntermediateShaderMaterialBinder
          material={material}
          extension={extensions[0]}
          />
        <IntermediateShaderMaterial
          material={material}
          extensions={nextExtensions}
          />
      </>
    )
  return <primitive object={material} attach="material" />
}

/**
 * Binds a {@link ExtensibleShaderMaterial}. This material will receive shader
 * material extension chunks and uniforms provided by parent contexts.
 * @param props.material the extensible material to use
 */
export const ExtendedShaderMaterial = 
  ({ material }: { material: ExtensibleShaderMaterial }) => (
    <IntermediateShaderMaterial
      material={material}
      extensions={useContext(ExtensionSetContext)}
      />
  )
