import { ShaderMaterial, ShaderMaterialParameters,
  WebGLProgramParametersWithUniforms, WebGLRenderer } from "three"


/**
 * Data class which holds shader material extensions.
 */
export class ShaderMaterialExtension {
  constructor (
    public uniforms: ShaderMaterialParameters["uniforms"],
    public vertexShaderChunk: string | undefined,
    public fragmentShaderChunk: string | undefined
  ) { }
}

/**
 * Base class for all shader material which can be extended - augmented with
 * uniforms and vertex or fragment shader chunks.
 */
export class ExtensibleShaderMaterial extends ShaderMaterial {
  private shaderExtensions: Set<ShaderMaterialExtension>

  constructor (options: ShaderMaterialParameters) {
    super(options)
    this.shaderExtensions = new Set()
  }

  public extend (extension: ShaderMaterialExtension) {
    this.shaderExtensions.add(extension)
  }

  public onBeforeCompile(
    parameters: WebGLProgramParametersWithUniforms,
    _renderer: WebGLRenderer
  ): void {
    for (const extension of this.shaderExtensions) {
      parameters.uniforms = { ...parameters.uniforms, ...extension.uniforms }
      if (extension.vertexShaderChunk)
        parameters.vertexShader = 
          extension.vertexShaderChunk + parameters.vertexShader
      if (extension.fragmentShaderChunk)
        parameters.fragmentShader =
          extension.fragmentShaderChunk + parameters.fragmentShader
    }
  }
}
