"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftDiffuseColoredAlphaShader = void 0;
const SoftDiffuseColoredShader_1 = require("./SoftDiffuseColoredShader");
class SoftDiffuseColoredAlphaShader extends SoftDiffuseColoredShader_1.SoftDiffuseColoredShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "precision highp float;\n" +
            "uniform vec2 uCameraRange;\n" +
            "uniform vec2 uInvViewportSize;\n" +
            "uniform float uTransitionSize;\n" +
            "float calc_depth(in float z)\n" +
            "{\n" +
            "  return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));\n" +
            "}\n" +
            "uniform sampler2D sDepth;\n" +
            "varying vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 color;\n" +
            "\n" +
            "void main() {\n" +
            "   vec4 mask = vec4(texture2D(sTexture, vTextureCoord).rrr, 1.0);\n" + // particle base diffuse color
            "   vec4 diffuse = mask * color;\n" + // particle base diffuse color
            // "   diffuse += vec4(0.0, 0.0, 1.0, 1.0);\n"+ // uncomment to visualize particle shape
            "   vec2 coords = gl_FragCoord.xy * uInvViewportSize;\n" + // calculate depth texture coordinates
            "   float geometryZ = calc_depth(texture2D(sDepth, coords).r);\n" + // lineriarize particle depth
            "   float sceneZ = calc_depth(gl_FragCoord.z);\n" + // lineriarize scene depth
            "   float a = clamp(geometryZ - sceneZ, 0.0, 1.0);\n" + // linear clamped diff between scene and particle depth
            "   float b = smoothstep(0.0, uTransitionSize, a);\n" + // apply smoothstep to make soft transition
            "   b = b * mask.r * color.w;\n" +
            "   gl_FragColor = vec4(diffuse.rgb * b, b);\n" + // final color is multiplied by alpha, with soft edge
            "}";
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
        this.sTexture = this.getUniform("sTexture");
        this.cameraRange = this.getUniform("uCameraRange");
        this.sDepth = this.getUniform("sDepth");
        this.invViewportSize = this.getUniform("uInvViewportSize");
        this.transitionSize = this.getUniform("uTransitionSize");
        this.color = this.getUniform("color");
    }
}
exports.SoftDiffuseColoredAlphaShader = SoftDiffuseColoredAlphaShader;
//# sourceMappingURL=SoftDiffuseColoredAlphaShader.js.map