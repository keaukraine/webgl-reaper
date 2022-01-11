import { DiffuseShader } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
export declare class DiffuseOneChannelShader extends DiffuseShader implements DrawableShader {
    fillCode(): void;
}
