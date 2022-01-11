import { DiffuseShader } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
export declare class DiffuseAlphaShader extends DiffuseShader implements DrawableShader {
    sAlphaTexture: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
