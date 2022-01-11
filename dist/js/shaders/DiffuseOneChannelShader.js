"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffuseOneChannelShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class DiffuseOneChannelShader extends webgl_framework_1.DiffuseShader {
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
exports.DiffuseOneChannelShader = DiffuseOneChannelShader;
//# sourceMappingURL=DiffuseOneChannelShader.js.map