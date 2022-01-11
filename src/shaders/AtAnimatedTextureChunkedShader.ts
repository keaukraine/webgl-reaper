import { DiffuseAnimatedTextureChunkedShader } from "./DiffuseAnimatedTextureChunkedShader";

export class AtAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader {
    fillCode() {
        super.fillCode();

        this.fragmentShaderCode =  "#version 300 es\n" +
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
