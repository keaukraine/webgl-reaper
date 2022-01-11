import { FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { DiffuseColoredShader } from "./DiffuseColoredShader";
export declare class SkyShader extends DiffuseColoredShader {
    sDisplacement: WebGLUniformLocation | undefined;
    uTime: WebGLUniformLocation | undefined;
    uLightning: WebGLUniformLocation | undefined;
    uLightningExponent: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
