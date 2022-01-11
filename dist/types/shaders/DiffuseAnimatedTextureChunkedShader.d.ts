import { DiffuseAnimatedTextureShader } from "./DiffuseAnimatedTextureShader";
import { IAnimatedTextureChunkedShader } from "./IAnimatedTextureChunkedShader";
export declare class DiffuseAnimatedTextureChunkedShader extends DiffuseAnimatedTextureShader implements IAnimatedTextureChunkedShader {
    uTexelHeight: WebGLUniformLocation | undefined;
    uTextureWidthInt: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
