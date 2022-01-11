import { DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class BendShader extends DiffuseShader implements DrawableShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    color: WebGLUniformLocation | undefined;
    radius: WebGLUniformLocation | undefined;
    lengthToRadius: WebGLUniformLocation | undefined;
    protected _color: number[] = [1, 1, 0, 0];
    protected _radius: number = 50.0;
    protected _length: number = 1.0;

    // Attributes are numbers.
    // rm_Vertex: number | undefined;

    fillCode() {
        //super.fillCode();
        this.vertexShaderCode = `
            uniform mat4 view_proj_matrix;
            attribute vec4 rm_Vertex;
            attribute vec2 rm_TexCoord0;
            varying vec2 vTextureCoord;
            uniform float R;
            uniform float lengthToRadius;
            
            void main() {
              float theta = rm_Vertex.x * lengthToRadius;

              gl_Position = view_proj_matrix * vec4(R * sin(theta), R * cos(theta), rm_Vertex.z, 1.0);
              vTextureCoord = rm_TexCoord0;
            }`;

        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform vec4 color;

            void main() {
                float alpha = texture2D(sTexture, vTextureCoord).r * color.a;
                gl_FragColor = vec4(color.rgb * alpha, alpha);
                //gl_FragColor = texture2D(sTexture, vTextureCoord) * color;
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.color = this.getUniform("color");
        this.radius = this.getUniform("R");
        this.lengthToRadius = this.getUniform("lengthToRadius");
    }

    public setColor(r: number, g: number, b: number, a: number) {
        this._color = [r, g, b, a];
    }

    public setRadius(r: number) {
        this._radius = r;
    }

    public setLength(l: number) {
        this._length = l;
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined || this.radius == undefined || this.lengthToRadius == undefined) {
            return;
        }

        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        gl.uniform1f(this.radius, this._radius);
        gl.uniform1f(this.lengthToRadius, this._length / this._radius);

        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
