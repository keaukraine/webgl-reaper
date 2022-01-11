import { DiffuseAnimatedTextureChunkedShader } from "./DiffuseAnimatedTextureChunkedShader";

export class LitAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader {
    sNormals: WebGLUniformLocation | undefined;
    uLightDir: WebGLUniformLocation | undefined;
    uLightColor: WebGLUniformLocation | undefined;
    uLightIntensity: WebGLUniformLocation | undefined;

    fillCode() {
        this.vertexShaderCode = "#version 300 es\n" +
            "precision highp float;\n" +
            "uniform sampler2D sPositions;\n" +
            "uniform sampler2D sNormals;\n" +
            "// x = texture width; y = texel half width; z = sampler y coord (animation frame); w = chunk size\n" +
            "uniform vec4 uTexelSizes;\n" +
            "uniform float uTexelHeight;\n" +
            "uniform int uTextureWidthInt;\n" +
            "uniform vec4 uLightDir;\n" +
            "uniform float uLightIntensity;\n" +
            "uniform mat4 view_proj_matrix;\n" +
            "in vec2 rm_TexCoord0;\n" +
            "out vec2 vTextureCoord;\n" +
            "out float vVertexLight;\n" +
            "\n" +
            "float getCenter(float y) {\n" +
            "  return y - mod(y, uTexelHeight) + uTexelHeight * 0.5;\n" +
            "}\n" +
            "\n" +
            "vec4 linearFilter(vec2 coords, sampler2D sTexture) {\n" +
            "  vec2 coords1 = vec2(coords.x, coords.y - uTexelHeight * 0.49);\n" +
            "  vec2 coords2 = vec2(coords.x, coords.y + uTexelHeight * 0.49);\n" +
            "  float center1 = getCenter(coords1.y);\n" +
            "  float center2 = getCenter(coords2.y);\n" +
            "  vec4 v1 = texture(sTexture, vec2(coords1.x, center1));\n" +
            "  vec4 v2 = texture(sTexture, vec2(coords2.x, center2));\n" +
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
            "  vec4 position = linearFilter(coords, sPositions);" +
            "  vec4 normal = linearFilter(coords, sNormals);" +
            "  gl_Position = view_proj_matrix * position;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            // "  vec4 lightDir = vec4(1.0, 0.0, 0.0, 0.0);\n" +
            "  float d = pow( max(0.0, dot(normal, uLightDir)), 5.0 );\n" +
            // "  float d = clamp(pow(dot(normal, lightDir), 13.0), 0.0, 1.0);\n" +
            "  vVertexLight = d * uLightIntensity;\n" +
            // "  vVertexLight = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0), d);\n" +
            "}";

        this.fragmentShaderCode = "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec2 vTextureCoord;\n" +
            "in float vVertexLight;\n" +
            "uniform sampler2D sTexture;\n" +
            "uniform vec4 uLightColor;\n" +
            "out vec4 fragColor;\n" +
            "\n" +
            "void main() {\n" +
            "  vec4 color = texture(sTexture, vTextureCoord);\n" +
            // "  fragColor = color;\n" +
            // "  fragColor *= 0.1; fragColor += vVertexLight;\n" +
            "  vec4 highlight = color + uLightColor;\n" +
            "  fragColor = mix(color, highlight, vVertexLight);\n" +

            // "  fragColor = color * vVertexLight;\n" +
            "}";
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sNormals = this.getUniform("sNormals");
        this.uLightDir = this.getUniform("uLightDir");
        this.uLightColor = this.getUniform("uLightColor");
        this.uLightIntensity = this.getUniform("uLightIntensity");
    }
}
