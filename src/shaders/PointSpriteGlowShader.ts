import { DiffuseShader } from "webgl-framework";
// import { FogShader } from "./FogShader";

export class PointSpriteGlowShader extends DiffuseShader {
    color: WebGLUniformLocation | undefined;

    model_matrix: WebGLUniformLocation | undefined;

    cameraRange: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invViewportSize: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();

        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform mat4 view_matrix;
            // uniform mat4 model_matrix;
            // out vec2 vTexCoord;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${/*FogShader.FOG_VERTEX_UNIFORMS_VARYINGS*/""}

            void main(void) {
                gl_Position = view_proj_matrix * rm_Vertex;

                vec3 ndc = gl_Position.xyz / gl_Position.w; // perspective divide.
                float zDist = 1.0 - ndc.z; // 1 is close (right up in your face,)
                // gl_PointSize = 888.;
                gl_PointSize = 888. * zDist;

                ${/*FogShader.FOG_VERTEX_MAIN*/""}
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            // in mediump vec2 vTexCoord;
            out vec4 fragColor;

            uniform vec2 uCameraRange;
            uniform vec2 uInvViewportSize;
            // uniform float uTransitionSize;
            float calc_depth(in float z) {
              return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));
            }
            uniform sampler2D sDepth;

            const float ONE = 1.0;

            ${/*FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS*/""}

            void main(void) {
                vec2 coords = gl_FragCoord.xy * uInvViewportSize; // calculate depth texture coordinates
                float geometryZ = calc_depth(texture(sDepth, coords).r); // lineriarize particle depth
                float sceneZ = calc_depth(gl_FragCoord.z); // lineriarize scene depth
                // float a = ONE - clamp(geometryZ - sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                // float a = ONE - clamp(geometryZ - sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                // float a = ONE - clamp(sceneZ - geometryZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                // float a = ONE - clamp(geometryZ-sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                float a = ONE - (geometryZ-sceneZ); // linear clamped diff between scene and particle depth
                // a = pow(a, .5);

                ${/*FogShader.FOG_AMOUNT_FRAGMENT*/""}
                // vec4 diffuse = texture(sTexture, vTexCoord).rrrr * color;
                vec4 diffuse = texture(sTexture, gl_PointCoord).rrrr * color;
                fragColor = diffuse * a;

                fragColor *= 0.0001; fragColor.r = a;
                // fragColor *= 0.0001; fragColor.r = geometryZ;
                // if(gl_PointCoord.x > 0.5 ) { fragColor *= 0.0001; fragColor.r = sceneZ; }
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        // this.model_matrix = this.getUniform("model_matrix");
        this.color = this.getUniform("color");

        this.cameraRange = this.getUniform("uCameraRange");
        this.sDepth = this.getUniform("sDepth");
        this.invViewportSize = this.getUniform("uInvViewportSize");
    }
}
