"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepthAnimatedTextureChunkedShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class DepthAnimatedTextureChunkedShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = "#version 300 es\n" +
            "precision highp float;\n" +
            "uniform sampler2D sPositions;\n" +
            "// x = texture width; y = texel half width; z = sampler y coord (animation frame); w = chunk size\n" +
            "uniform vec4 uTexelSizes;\n" +
            "uniform float uTexelHeight;\n" +
            "uniform int uTextureWidthInt;\n" +
            "uniform mat4 view_proj_matrix;\n" +
            "\n" +
            "float getCenter(float y) {\n" +
            "  return y - mod(y, uTexelHeight) + uTexelHeight * 0.5;\n" +
            "}\n" +
            "\n" +
            "vec4 linearFilter(vec2 coords) {\n" +
            "  vec2 coords1 = vec2(coords.x, coords.y - uTexelHeight * 0.49);\n" +
            "  vec2 coords2 = vec2(coords.x, coords.y + uTexelHeight * 0.49);\n" +
            "  float center1 = getCenter(coords1.y);\n" +
            "  float center2 = getCenter(coords2.y);\n" +
            "  vec4 v1 = texture(sPositions, vec2(coords1.x, center1));\n" +
            "  vec4 v2 = texture(sPositions, vec2(coords2.x, center2));\n" +
            "  float d1 = abs(coords.y - center1);\n" +
            "  float d2 = abs(coords.y - center2);\n" +
            "  if (d1 > d2) {\n" +
            "    return mix( v1, v2, d1 / (uTexelHeight) );\n" +
            "  } else {\n" +
            "    return mix( v2, v1, d2 / (uTexelHeight) );\n" +
            "  }\n" +
            "}\n" +
            "\n" +
            "void main() {\n" +
            "  float id = float(gl_VertexID % uTextureWidthInt);" +
            "  float chunk = float(gl_VertexID / uTextureWidthInt);" +
            "  vec2 coords = vec2(id / uTexelSizes.x + uTexelSizes.y, uTexelSizes.z);" +
            "  coords.y += chunk * uTexelSizes.w;" +
            "  vec4 position = linearFilter(coords);" +
            "  gl_Position = view_proj_matrix * position;\n" +
            "}";
        this.fragmentShaderCode = "#version 300 es\n" +
            "precision mediump float;\n" +
            "out vec4 fragColor;\n" +
            "\n" +
            "void main() {\n" +
            "  fragColor = vec4(0.0, 1.0, 0.0, 1.0);\n" +
            "}";
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        this.uTextureWidthInt = this.getUniform("uTextureWidthInt");
        this.uTexelHeight = this.getUniform("uTexelHeight");
        this.sPositions = this.getUniform("sPositions");
        this.uTexelSizes = this.getUniform("uTexelSizes");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}
exports.DepthAnimatedTextureChunkedShader = DepthAnimatedTextureChunkedShader;
//# sourceMappingURL=DepthAnimatedTextureChunkedShader.js.map