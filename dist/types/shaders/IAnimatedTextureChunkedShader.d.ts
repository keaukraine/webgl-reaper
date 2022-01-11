import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
export interface IAnimatedTextureChunkedShader extends DrawableShader {
    sPositions: WebGLUniformLocation | undefined;
    uTexelSizes: WebGLUniformLocation | undefined;
    uTexelHeight: WebGLUniformLocation | undefined;
    uTextureWidthInt: WebGLUniformLocation | undefined;
}
