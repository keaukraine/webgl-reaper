import { DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { DiffuseColoredShader } from "./DiffuseColoredShader";

export class SkyShader extends DiffuseColoredShader {
    // Uniforms are of type `WebGLUniformLocation`
    sDisplacement: WebGLUniformLocation | undefined;
    uTime: WebGLUniformLocation | undefined;
    uLightning: WebGLUniformLocation | undefined;
    uLightningExponent: WebGLUniformLocation | undefined;
    // Attributes are numbers.

    fillCode() {
        super.fillCode();

        this.vertexShaderCode = `uniform mat4 view_proj_matrix;
            attribute vec4 rm_Vertex;
            attribute vec2 rm_TexCoord0;
            varying vec2 vTextureCoord;
            varying vec2 vTextureCoordDisplacement;
            uniform float uTime;
            
            void main() {
                gl_Position = view_proj_matrix * rm_Vertex;
                vTextureCoord = rm_TexCoord0;
                // vTextureCoordDisplacement = rm_TexCoord0 * 0.35 + vec2(uTime, uTime);
                vTextureCoordDisplacement = rm_TexCoord0 + vec2(uTime, uTime);
            }`;

        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            varying vec2 vTextureCoordDisplacement;
            uniform sampler2D sTexture;
            uniform sampler2D sDisplacement;
            uniform vec4 color;
            uniform float uLightning;
            uniform vec4 uLightningExponent;

            void main() {
                vec2 offset = texture2D(sDisplacement, vTextureCoordDisplacement).xz * 0.025;
                vec2 texCoord = vTextureCoord + offset;
                vec4 grayscale = vec4(texture2D(sTexture, texCoord).rrr, 1.0);
                grayscale += pow(grayscale, uLightningExponent) * uLightning;
                gl_FragColor = grayscale * color;
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sDisplacement = this.getUniform("sDisplacement");
        this.uTime = this.getUniform("uTime");
        this.uLightning = this.getUniform("uLightning");
        this.uLightningExponent = this.getUniform("uLightningExponent");
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }

        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);

        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
