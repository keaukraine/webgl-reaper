"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexVignetteShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class VertexVignetteShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = `uniform mat4 view_proj_matrix;
            attribute vec4 rm_Vertex;
            attribute mediump float aAO;

            uniform mediump vec4 color0;
            uniform mediump vec4 color1;
            varying mediump vec4 vAO;

            void main() {
              gl_Position = view_proj_matrix * rm_Vertex;
              vAO = mix(color0, color1, aAO);
            }`;
        this.fragmentShaderCode = `precision mediump float;
            varying vec4 vAO;

            const float MIN = 0.0;
            const float MAX = 1.0;

            void main() {
              gl_FragColor = smoothstep(MIN, MAX, vAO);
            }`;
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.color0 = this.getUniform("color0");
        this.color1 = this.getUniform("color1");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_AO = this.getAttrib("aAO");
    }
    drawVignette(renderer, model) {
        if (this.rm_Vertex === undefined || this.rm_AO === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_AO);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 8, 0);
        gl.vertexAttribPointer(this.rm_AO, 1, gl.UNSIGNED_BYTE, true, 8, 6);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getOrthoMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexVignetteShader glDrawElements");
    }
}
exports.VertexVignetteShader = VertexVignetteShader;
//# sourceMappingURL=VertexVignetteShader.js.map