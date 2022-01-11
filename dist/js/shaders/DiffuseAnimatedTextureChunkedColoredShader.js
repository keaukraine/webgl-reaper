"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffuseAnimatedTextureChunkedColoredShader = void 0;
const DiffuseAnimatedTextureChunkedShader_1 = require("./DiffuseAnimatedTextureChunkedShader");
class DiffuseAnimatedTextureChunkedColoredShader extends DiffuseAnimatedTextureChunkedShader_1.DiffuseAnimatedTextureChunkedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 uColor;\n" +
            "out vec4 fragColor;\n" +
            "\n" +
            "void main() {\n" +
            "  fragColor = uColor * texture(sTexture, vTextureCoord);\n" +
            "}";
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.uColor = this.getUniform("uColor");
    }
}
exports.DiffuseAnimatedTextureChunkedColoredShader = DiffuseAnimatedTextureChunkedColoredShader;
//# sourceMappingURL=DiffuseAnimatedTextureChunkedColoredShader.js.map