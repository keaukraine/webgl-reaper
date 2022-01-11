"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BendShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class BendShader extends webgl_framework_1.DiffuseShader {
    constructor() {
        super(...arguments);
        this._color = [1, 1, 0, 0];
        this._radius = 50.0;
        this._length = 1.0;
    }
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
    setColor(r, g, b, a) {
        this._color = [r, g, b, a];
    }
    setRadius(r) {
        this._radius = r;
    }
    setLength(l) {
        this._length = l;
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
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
exports.BendShader = BendShader;
//# sourceMappingURL=BendShader.js.map