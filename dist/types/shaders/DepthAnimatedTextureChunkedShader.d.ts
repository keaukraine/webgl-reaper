import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { IAnimatedTextureChunkedShader } from "./IAnimatedTextureChunkedShader";
export declare class DepthAnimatedTextureChunkedShader extends BaseShader implements IAnimatedTextureChunkedShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    uTexelHeight: WebGLUniformLocation | undefined;
    uTextureWidthInt: WebGLUniformLocation | undefined;
    sPositions: WebGLUniformLocation | undefined;
    uTexelSizes: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
