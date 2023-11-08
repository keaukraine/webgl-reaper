import { DiffuseShader } from "webgl-framework";
export declare class PointSpriteGlowShader extends DiffuseShader {
    color: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    cameraRange: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invViewportSize: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
