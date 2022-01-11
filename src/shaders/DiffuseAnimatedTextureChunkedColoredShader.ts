import { DiffuseAnimatedTextureChunkedShader } from "./DiffuseAnimatedTextureChunkedShader";

export class DiffuseAnimatedTextureChunkedColoredShader extends DiffuseAnimatedTextureChunkedShader {
    // Uniforms are of type `WebGLUniformLocation`
    uColor: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();

        this.fragmentShaderCode =  "#version 300 es\n" +
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
