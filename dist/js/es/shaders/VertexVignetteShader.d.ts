import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class VertexVignetteShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    color0: WebGLUniformLocation | undefined;
    color1: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_AO: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    drawVignette(renderer: RendererWithExposedMethods, model: FullModel): void;
}
