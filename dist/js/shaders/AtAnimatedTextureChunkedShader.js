"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtAnimatedTextureChunkedShader = void 0;
const DiffuseAnimatedTextureChunkedShader_1 = require("./DiffuseAnimatedTextureChunkedShader");
class AtAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader_1.DiffuseAnimatedTextureChunkedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "out vec4 fragColor;\n" +
            "\n" +
            "void main() {\n" +
            "  vec4 color = texture(sTexture, vTextureCoord);\n" +
            "  fragColor = color;\n" +
            "  if (fragColor.a < 0.1) {\n" +
            "    discard;\n" +
            "  }\n" +
            "}";
    }
}
exports.AtAnimatedTextureChunkedShader = AtAnimatedTextureChunkedShader;
//# sourceMappingURL=AtAnimatedTextureChunkedShader.js.map