import { DiffuseShader } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";

export class DiffuseOneChannelShader extends DiffuseShader implements DrawableShader {
    fillCode() {
        super.fillCode();

        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;

            void main() {
                float color = texture2D(sTexture, vTextureCoord).r;
                gl_FragColor = vec4(color, color, color, 1.0);
            }`;
    }
}
