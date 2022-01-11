"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffuseAlphaShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class DiffuseAlphaShader extends webgl_framework_1.DiffuseShader {
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
exports.DiffuseAlphaShader = DiffuseAlphaShader;
//# sourceMappingURL=DiffuseAlphaShader.js.map