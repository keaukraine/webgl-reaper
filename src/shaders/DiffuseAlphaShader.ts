import { DiffuseShader } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";

export class DiffuseAlphaShader extends DiffuseShader implements DrawableShader {
    sAlphaTexture: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();

        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform sampler2D sAlphaTexture;

            void main() {
                float alpha = texture2D(sAlphaTexture, vTextureCoord).r;
                gl_FragColor = texture2D(sTexture, vTextureCoord);
                gl_FragColor.rgb *= alpha;
                gl_FragColor.a = alpha;
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.sAlphaTexture = this.getUniform("sAlphaTexture");
    }
}
