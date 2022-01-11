import { DiffuseAnimatedTextureChunkedShader } from "./DiffuseAnimatedTextureChunkedShader";
export declare class DiffuseAnimatedTextureChunkedColoredShader extends DiffuseAnimatedTextureChunkedShader {
    uColor: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
