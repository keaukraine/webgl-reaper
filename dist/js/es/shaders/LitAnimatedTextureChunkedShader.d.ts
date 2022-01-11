import { DiffuseAnimatedTextureChunkedShader } from "./DiffuseAnimatedTextureChunkedShader";
export declare class LitAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader {
    sNormals: WebGLUniformLocation | undefined;
    uLightDir: WebGLUniformLocation | undefined;
    uLightColor: WebGLUniformLocation | undefined;
    uLightIntensity: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
