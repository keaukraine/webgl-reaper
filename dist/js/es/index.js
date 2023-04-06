
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
class FullScreenUtils {
    /** Enters fullscreen. */
    enterFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
    }
    /** Exits fullscreen */
    exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    /**
     * Adds cross-browser fullscreenchange event
     *
     * @param exitHandler Function to be called on fullscreenchange event
     */
    addFullScreenListener(exitHandler) {
        document.addEventListener("fullscreenchange", exitHandler, false);
    }
    /**
     * Checks fullscreen state.
     *
     * @return `true` if fullscreen is active, `false` if not
     */
    isFullScreen() {
        return !!document.fullscreenElement;
    }
}

class BinaryDataLoader {
    static async load(url) {
        const response = await fetch(url);
        return response.arrayBuffer();
    }
}

class UncompressedTextureLoader {
    static load(url, gl, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false) {
        return new Promise((resolve, reject) => {
            const texture = gl.createTexture();
            if (texture === null) {
                reject("Error creating WebGL texture");
                return;
            }
            const image = new Image();
            image.src = url;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
                if (clamp === true) {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                }
                gl.bindTexture(gl.TEXTURE_2D, null);
                if (image && image.src) {
                    console.log(`Loaded texture ${url} [${image.width}x${image.height}]`);
                }
                resolve(texture);
            };
            image.onerror = () => reject("Cannot load image");
        });
    }
    static async loadCubemap(url, gl) {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        const promises = [
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_X, suffix: "-posx.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, suffix: "-negx.png" },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, suffix: "-posy.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, suffix: "-negy.png" },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, suffix: "-posz.png" },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, suffix: "-negz.png" }
        ].map(face => new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url + face.suffix;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(face.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                if (image && image.src) {
                    console.log(`Loaded texture ${url}${face.suffix} [${image.width}x${image.height}]`);
                }
                resolve();
            };
            image.onerror = () => reject("Cannot load image");
        }));
        await Promise.all(promises);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
}

class FullModel {
    /** Default constructor. */
    constructor() {
        /** Number of model indices. */
        this.numIndices = 0;
    }
    loadBuffer(gl, buffer, target, arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, byteArray, gl.STATIC_DRAW);
    }
    /**
     * Loads model.
     *
     * @param url Base URL to model indices and strides files.
     * @param gl WebGL context.
     * @returns Promise which resolves when model is loaded.
     */
    async load(url, gl) {
        const [dataIndices, dataStrides] = await Promise.all([
            BinaryDataLoader.load(`${url}-indices.bin`),
            BinaryDataLoader.load(`${url}-strides.bin`)
        ]);
        console.log(`Loaded ${url}-indices.bin (${dataIndices.byteLength} bytes)`);
        console.log(`Loaded ${url}-strides.bin (${dataStrides.byteLength} bytes)`);
        this.bufferIndices = gl.createBuffer();
        this.loadBuffer(gl, this.bufferIndices, gl.ELEMENT_ARRAY_BUFFER, dataIndices);
        this.numIndices = dataIndices.byteLength / 2 / 3;
        this.bufferStrides = gl.createBuffer();
        this.loadBuffer(gl, this.bufferStrides, gl.ARRAY_BUFFER, dataStrides);
    }
    /**
     * Binds buffers for a `glDrawElements()` call.
     *
     * @param gl WebGL context.
     */
    bindBuffers(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferStrides);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndices);
    }
    /**
     * Returns number of indices in model.
     *
     * @return Number of indices
     */
    getNumIndices() {
        return this.numIndices;
    }
}

class BaseShader {
    /**
     * Constructor. Compiles shader.
     *
     * @param gl WebGL context.
     */
    constructor(gl) {
        this.gl = gl;
        this.vertexShaderCode = "";
        this.fragmentShaderCode = "";
        this.fillCode();
        this.initShader();
    }
    /**
     * Creates WebGL shader from code.
     *
     * @param type Shader type.
     * @param code GLSL code.
     * @returns Shader or `undefined` if there were errors during shader compilation.
     */
    getShader(type, code) {
        const shader = this.gl.createShader(type);
        if (!shader) {
            console.warn('Error creating shader.');
            return undefined;
        }
        this.gl.shaderSource(shader, code);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.warn(this.gl.getShaderInfoLog(shader));
            return undefined;
        }
        return shader;
    }
    /**
     * Get shader unform location.
     *
     * @param uniform Uniform name.
     * @return Uniform location.
     */
    getUniform(uniform) {
        if (this.program === undefined) {
            throw new Error('No program for shader.');
        }
        const result = this.gl.getUniformLocation(this.program, uniform);
        if (result !== null) {
            return result;
        }
        else {
            throw new Error(`Cannot get uniform "${uniform}".`);
        }
    }
    /**
     * Get shader attribute location.
     *
     * @param attrib Attribute name.
     * @return Attribute location.
     */
    getAttrib(attrib) {
        if (this.program === undefined) {
            throw new Error("No program for shader.");
        }
        return this.gl.getAttribLocation(this.program, attrib);
    }
    /** Initializes shader. */
    initShader() {
        const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderCode);
        const vertexShader = this.getShader(this.gl.VERTEX_SHADER, this.vertexShaderCode);
        const shaderProgram = this.gl.createProgram();
        if (fragmentShader === undefined || vertexShader === undefined || shaderProgram === null) {
            return;
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.warn(this.constructor.name + ": Could not initialise shader");
        }
        else {
            console.log(this.constructor.name + ": Initialised shader");
        }
        this.gl.useProgram(shaderProgram);
        this.program = shaderProgram;
        this.fillUniformsAttributes();
    }
    /** Activates shader. */
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        }
    }
    /** Deletes shader. */
    deleteProgram() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$3() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity$3(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$3(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate$2(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$3(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate$3(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$4() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$4(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create$4();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$5() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$1 = function () {
  var vec = create$5();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$6() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize$2 = normalize$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

var rotationTo = function () {
  var tmpvec3 = create$4();
  var xUnitVec3 = fromValues$4(1, 0, 0);
  var yUnitVec3 = fromValues$4(0, 1, 0);
  return function (out, a, b) {
    var dot$$1 = dot(a, b);

    if (dot$$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$$1;
      return normalize$2(out, out);
    }
  };
}();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

var sqlerp = function () {
  var temp1 = create$6();
  var temp2 = create$6();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

var setAxes = function () {
  var matr = create$2();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
}();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create$8() {
  var out = new ARRAY_TYPE(2);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$2 = function () {
  var vec = create$8();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();

class BaseRenderer {
    constructor() {
        this.mMMatrix = create$3();
        this.mVMatrix = create$3();
        this.mMVPMatrix = create$3();
        this.mProjMatrix = create$3();
        this.matOrtho = create$3();
        this.m_boundTick = this.tick.bind(this);
        this.isWebGL2 = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
    }
    /** Getter for current WebGL context. */
    get gl() {
        if (this.m_gl === undefined) {
            throw new Error("No WebGL context");
        }
        return this.m_gl;
    }
    /** Logs last GL error to console */
    logGLError() {
        var err = this.gl.getError();
        if (err !== this.gl.NO_ERROR) {
            console.warn(`WebGL error # + ${err}`);
        }
    }
    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTexture2D(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Binds cubemap texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTextureCubemap(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Calculates FOV for matrix.
     *
     * @param matrix Output matrix
     * @param fovY Vertical FOV in degrees
     * @param aspect Aspect ratio of viewport
     * @param zNear Near clipping plane distance
     * @param zFar Far clipping plane distance
     */
    setFOV(matrix, fovY, aspect, zNear, zFar) {
        const fH = Math.tan(fovY / 360.0 * Math.PI) * zNear;
        const fW = fH * aspect;
        frustum(matrix, -fW, fW, -fH, fH, zNear, zFar);
    }
    /**
     * Calculates MVP matrix. Saved in this.mMVPMatrix
     */
    calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        identity$3(this.mMMatrix);
        rotate$3(this.mMMatrix, this.mMMatrix, 0, [1, 0, 0]);
        translate$2(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale$3(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        rotateX(this.mMMatrix, this.mMMatrix, rx);
        rotateY(this.mMMatrix, this.mMMatrix, ry);
        rotateZ(this.mMMatrix, this.mMMatrix, rz);
        multiply$3(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        multiply$3(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    /** Perform each frame's draw calls here. */
    drawScene() {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    /** Called on each frame. */
    tick() {
        requestAnimationFrame(this.m_boundTick);
        this.resizeCanvas();
        this.drawScene();
        this.animate();
    }
    /**
     * Initializes WebGL context.
     *
     * @param canvas Canvas to initialize WebGL.
     */
    initGL(canvas) {
        const gl = canvas.getContext("webgl", { alpha: false });
        if (gl === null) {
            throw new Error("Cannot initialize WebGL context");
        }
        // this.isETC1Supported = !!gl.getExtension('WEBGL_compressed_texture_etc1');
        return gl;
    }
    ;
    /**
     * Initializes WebGL 2 context
     *
     * @param canvas Canvas to initialize WebGL 2.
     */
    initGL2(canvas) {
        let gl = canvas.getContext("webgl2", { alpha: false });
        if (gl === null) {
            console.warn('Could not initialise WebGL 2, falling back to WebGL 1');
            return this.initGL(canvas);
        }
        return gl;
    }
    ;
    /**
     * Initializes WebGL and calls all callbacks.
     *
     * @param canvasID ID of canvas element to initialize WebGL.
     * @param requestWebGL2 Set to `true` to initialize WebGL 2 context.
     */
    init(canvasID, requestWebGL2 = false) {
        this.onBeforeInit();
        this.canvas = document.getElementById(canvasID);
        if (this.canvas === null) {
            throw new Error("Cannot find canvas element");
        }
        this.viewportWidth = this.canvas.width;
        this.viewportHeight = this.canvas.height;
        this.m_gl = !!requestWebGL2 ? this.initGL2(this.canvas) : this.initGL(this.canvas);
        if (this.m_gl) {
            this.resizeCanvas();
            this.onAfterInit();
            this.initShaders();
            this.loadData();
            this.m_boundTick();
        }
        else {
            this.onInitError();
        }
    }
    /** Adjusts viewport according to resizing of canvas. */
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        const cssToRealPixels = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(this.canvas.clientWidth * cssToRealPixels);
        const displayHeight = Math.floor(this.canvas.clientHeight * cssToRealPixels);
        if (this.canvas.width != displayWidth || this.canvas.height != displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
    }
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    checkGlError(operation) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${operation}: glError ${error}`);
        }
    }
    /** @inheritdoc */
    unbindBuffers() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
    /** @inheritdoc */
    getMVPMatrix() {
        return this.mMVPMatrix;
    }
    /** @inheritdoc */
    getOrthoMatrix() {
        return this.matOrtho;
    }
    /** @inheritdoc */
    getModelMatrix() {
        return this.mMMatrix;
    }
    /** @inheritdoc */
    getViewMatrix() {
        return this.mVMatrix;
    }
}

class FrameBuffer {
    /** Constructor. */
    constructor(gl) {
        this.gl = gl;
        this.m_textureHandle = null;
        this.m_depthTextureHandle = null;
        this.m_framebufferHandle = null;
        this.m_depthbufferHandle = null;
    }
    /** Creates OpenGL objects */
    createGLData(width, height) {
        this.m_width = width;
        this.m_height = height;
        if (this.m_textureHandle !== null && this.m_width > 0 && this.m_height > 0) {
            this.m_framebufferHandle = this.gl.createFramebuffer(); // alternative to GLES20.glGenFramebuffers()
            if (this.m_textureHandle !== null) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_textureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.m_textureHandle, 0);
                this.checkGlError("FB");
            }
            if (this.m_depthTextureHandle === null) {
                this.m_depthbufferHandle = this.gl.createRenderbuffer();
                this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glBindRenderbuffer");
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.m_width, this.m_height);
                this.checkGlError("FB - glRenderbufferStorage");
                this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glFramebufferRenderbuffer");
            }
            else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_depthTextureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.m_depthTextureHandle, 0);
                this.checkGlError("FB depth");
            }
            const result = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (result != this.gl.FRAMEBUFFER_COMPLETE) {
                console.error(`Error creating framebufer: ${result}`);
            }
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            // this.gl.bindTexture(this.gl.TEXTURE_2D, 0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    }
    checkGlError(op) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${op}: glError ${error}`);
        }
    }
    get width() {
        return this.m_width;
    }
    set width(value) {
        this.m_width = value;
    }
    get height() {
        return this.m_height;
    }
    set height(value) {
        this.m_height = value;
    }
    get textureHandle() {
        return this.m_textureHandle;
    }
    set textureHandle(value) {
        this.m_textureHandle = value;
    }
    get depthbufferHandle() {
        return this.m_depthbufferHandle;
    }
    set depthbufferHandle(value) {
        this.m_depthbufferHandle = value;
    }
    get framebufferHandle() {
        return this.m_framebufferHandle;
    }
    set framebufferHandle(value) {
        this.m_framebufferHandle = value;
    }
    get depthTextureHandle() {
        return this.m_depthTextureHandle;
    }
    set depthTextureHandle(value) {
        this.m_depthTextureHandle = value;
    }
}

/** Utilities to create various textures. */
class TextureUtils {
    /**
     * Creates non-power-of-two (NPOT) texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     * @param hasAlpha Set to `true` to create texture with alpha channel.
     */
    static createNpotTexture(gl, texWidth, texHeight, hasAlpha = false) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let glFormat = null, glInternalFormat = null;
        if (hasAlpha) {
            glFormat = gl.RGBA;
            glInternalFormat = gl.RGBA;
        }
        else {
            glFormat = gl.RGB;
            glInternalFormat = gl.RGB;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, gl.UNSIGNED_BYTE, null);
        return textureID;
    }
    /**
     * Creates depth texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     */
    static createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
}

class DiffuseShader extends BaseShader {
    /** @inheritdoc */
    fillCode() {
        this.vertexShaderCode = 'uniform mat4 view_proj_matrix;\n' +
            'attribute vec4 rm_Vertex;\n' +
            'attribute vec2 rm_TexCoord0;\n' +
            'varying vec2 vTextureCoord;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_Position = view_proj_matrix * rm_Vertex;\n' +
            '  vTextureCoord = rm_TexCoord0;\n' +
            '}';
        this.fragmentShaderCode = 'precision mediump float;\n' +
            'varying vec2 vTextureCoord;\n' +
            'uniform sampler2D sTexture;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_FragColor = texture2D(sTexture, vTextureCoord);\n' +
            '}';
    }
    /** @inheritdoc */
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        this.rm_Vertex = this.getAttrib('rm_Vertex');
        this.rm_TexCoord0 = this.getAttrib('rm_TexCoord0');
        this.sTexture = this.getUniform('sTexture');
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.rm_TexCoord0 === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}
//# sourceMappingURL=webgl-framework.es6.js.map

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON$1 = 0.000001;
var ARRAY_TYPE$1 = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create() {
  var out = new ARRAY_TYPE$1(16);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new ARRAY_TYPE$1(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.orthoNO}
 * @function
 */

var ortho = orthoNO;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON$1 && Math.abs(eyey - centery) < EPSILON$1 && Math.abs(eyez - centerz) < EPSILON$1) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$1() {
  var out = new ARRAY_TYPE$1(3);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale$1(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$3(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function random(out, scale) {
  scale = scale || 1.0;
  var r = RANDOM() * 2.0 * Math.PI;
  var z = RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach$3 = function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

class DiffuseColoredShader extends DiffuseShader {
    constructor() {
        super(...arguments);
        this._color = [1, 1, 0, 0];
    }
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform vec4 color;

            void main() {
                gl_FragColor = texture2D(sTexture, vTextureCoord) * color;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
    }
    setColor(r, g, b, a) {
        this._color = [r, g, b, a];
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }
        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
//# sourceMappingURL=DiffuseColoredShader.js.map

class BendShader extends DiffuseShader {
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
//# sourceMappingURL=BendShader.js.map

var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["Rotating"] = 0] = "Rotating";
    CameraMode[CameraMode["Random"] = 1] = "Random";
})(CameraMode || (CameraMode = {}));
//# sourceMappingURL=CameraMode.js.map

class CameraPositionInterpolator {
    constructor() {
        this._speed = 0;
        this.duration = 0;
        this._minDuration = 3000;
        this._timer = 0;
        this.lastTime = 0;
        this._reverse = false;
        this._cameraPosition = create$1();
        this._cameraRotation = create$1();
        this._matrix = create();
    }
    get cameraPosition() {
        return this._cameraPosition;
    }
    get cameraRotation() {
        return this._cameraRotation;
    }
    set reverse(value) {
        this._reverse = value;
    }
    set minDuration(value) {
        this._minDuration = value;
    }
    get matrix() {
        return this._matrix;
    }
    get speed() {
        return this._speed;
    }
    set speed(value) {
        this._speed = value;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this.duration = Math.max(this.getLength() / this.speed, this._minDuration);
    }
    get timer() {
        return this._timer;
    }
    getLength() {
        if (this.position === undefined) {
            return 0;
        }
        const start = this.position.start.position;
        const end = this.position.end.position;
        return Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2);
    }
    iterate(timeNow) {
        if (this.lastTime != 0) {
            const elapsed = timeNow - this.lastTime;
            this._timer += elapsed / this.duration;
            if (this._timer > 1.0) {
                this._timer = 1.0;
            }
        }
        this.lastTime = timeNow;
        this.updateMatrix();
    }
    reset() {
        this._timer = 0;
        this.updateMatrix();
    }
    updateMatrix() {
        if (this._position === undefined) {
            return;
        }
        const start = this._reverse ? this._position.end : this._position.start;
        const end = this._reverse ? this._position.start : this._position.end;
        this._cameraPosition[0] = start.position[0] + this._timer * (end.position[0] - start.position[0]);
        this._cameraPosition[1] = start.position[1] + this._timer * (end.position[1] - start.position[1]);
        this._cameraPosition[2] = start.position[2] + this._timer * (end.position[2] - start.position[2]);
        this._cameraRotation[0] = start.rotation[0] + this._timer * (end.rotation[0] - start.rotation[0]);
        this._cameraRotation[1] = start.rotation[1] + this._timer * (end.rotation[1] - start.rotation[1]);
        this._cameraRotation[2] = start.rotation[2] + this._timer * (end.rotation[2] - start.rotation[2]);
        identity(this.matrix);
        rotateX$1(this.matrix, this.matrix, this._cameraRotation[0] - Math.PI / 2.0);
        rotateZ$1(this.matrix, this.matrix, this._cameraRotation[1]);
        rotateY$1(this.matrix, this.matrix, this._cameraRotation[2]);
        translate(this.matrix, this.matrix, [-this._cameraPosition[0], -this._cameraPosition[1], -this._cameraPosition[2]]);
    }
}
//# sourceMappingURL=CameraPositionInterpolator.js.map

class DiffuseAlphaShader extends DiffuseShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform sampler2D sAlphaTexture;

            void main() {
                float alpha = texture2D(sAlphaTexture, vTextureCoord).r;
                gl_FragColor = texture2D(sTexture, vTextureCoord);
                gl_FragColor.rgb *= alpha;
                gl_FragColor.a = alpha;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sAlphaTexture = this.getUniform("sAlphaTexture");
    }
}
//# sourceMappingURL=DiffuseAlphaShader.js.map

class DiffuseAnimatedTextureShader extends DiffuseShader {
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        this.vertexShaderCode = "#version 300 es\n" +
            "precision highp float;\n" +
            "uniform sampler2D sPositions;\n" +
            "uniform vec3 uTexelSizes; // x = vertex count; y = texel half width; z = sampler y coord (animation frame)\n" +
            "uniform mat4 view_proj_matrix;\n" +
            "in vec2 rm_TexCoord0;\n" +
            "out vec2 vTextureCoord;\n" +
            "\n" +
            "void main() {\n" +
            "  float id = float(gl_VertexID);" +
            "  vec4 position = texture(sPositions, vec2(id / uTexelSizes.x + uTexelSizes.y, uTexelSizes.z));" +
            "  gl_Position = view_proj_matrix * position;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "}";
        this.fragmentShaderCode = "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec2 vTextureCoord;\n" +
            "uniform sampler2D sTexture;\n" +
            "out vec4 fragColor;\n" +
            "\n" +
            "void main() {\n" +
            "  fragColor = texture(sTexture, vTextureCoord);\n" +
            "}";
    }
    fillUniformsAttributes() {
        // super.fillUniformsAttributes();
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        // this.rm_Vertex = this.getAttrib('rm_Vertex');
        this.rm_TexCoord0 = this.getAttrib('rm_TexCoord0');
        this.sTexture = this.getUniform('sTexture');
        this.sPositions = this.getUniform("sPositions");
        this.uTexelSizes = this.getUniform("uTexelSizes");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_TexCoord0 === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        // gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        // gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 4, 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}
//# sourceMappingURL=DiffuseAnimatedTextureShader.js.map

class DiffuseAnimatedTextureChunkedShader extends DiffuseAnimatedTextureShader {
    // Attributes are numbers.
    // rm_Vertex: number | undefined;
    fillCode() {
        super.fillCode();
        this.vertexShaderCode = "#version 300 es\n" +
            "precision highp float;\n" +
            "uniform sampler2D sPositions;\n" +
            "// x = texture width; y = texel half width; z = sampler y coord (animation frame); w = chunk size\n" +
            "uniform vec4 uTexelSizes;\n" +
            "uniform float uTexelHeight;\n" +
            "uniform int uTextureWidthInt;\n" +
            "uniform mat4 view_proj_matrix;\n" +
            "in vec2 rm_TexCoord0;\n" +
            "out vec2 vTextureCoord;\n" +
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
            "  vTextureCoord = rm_TexCoord0;\n" +
            "}";
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.uTextureWidthInt = this.getUniform("uTextureWidthInt");
        this.uTexelHeight = this.getUniform("uTexelHeight");
    }
}
//# sourceMappingURL=DiffuseAnimatedTextureChunkedShader.js.map

class TextureAnimationChunked {
    constructor(textureWidth, vertices, frames) {
        this.m_frames = 0;
        this.m_vertices = 0;
        this.m_texelHalfWidth = 0;
        this.m_texelHalfHeight = 0;
        this.m_texelHeight = 0;
        this.m_textureWidth = 0;
        this.m_textureHeight = 0;
        this.m_chunkSize = 0;
        this.m_textureWidth = textureWidth;
        this.m_vertices = vertices;
        this.m_frames = frames;
        this.m_textureHeight = Math.ceil(vertices / textureWidth) * (frames + 1);
        this.m_texelHalfWidth = 1.0 / textureWidth * 0.5;
        this.m_texelHalfHeight = 1.0 / this.m_textureHeight * 0.5;
        this.m_texelHeight = 1.0 / this.m_textureHeight;
        this.m_chunkSize = 1.0 / Math.ceil(vertices / textureWidth);
    }
    get chunkSize() {
        return this.m_chunkSize;
    }
    get vertices() {
        return this.m_vertices;
    }
    get frames() {
        return this.m_frames;
    }
    get texelHalfWidth() {
        return this.m_texelHalfWidth;
    }
    get texelHalfHeight() {
        return this.m_texelHalfHeight;
    }
    get textureWidth() {
        return this.m_textureWidth;
    }
    get textureHeight() {
        return this.m_textureHeight;
    }
    animateStartEndStart(timer) {
        const coeff = timer < 0.5
            ? timer * 2
            : (1 - timer) * 2;
        const y = this.m_texelHeight * coeff * (this.frames - 1) + this.m_texelHalfHeight;
        return y;
    }
    animateStartToEnd(timer) {
        return this.m_texelHeight * timer * (this.frames - 1) + this.m_texelHalfHeight;
    }
}
//# sourceMappingURL=TextureAnimationChunked.js.map

class PointSpriteColoredShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 uMvp;\n" +
            "uniform float uThickness;\n" +
            "\n" +
            "attribute vec4 aPosition;\n" +
            "\n" +
            "void main() {\n" +
            // "    vec4 position = uMvp * vec4(aPosition.xyz, 1.0);\n" +
            "    vec4 position = uMvp * aPosition;\n" +
            // "    vec3 ndc = position.xyz / position.w; // perspective divide.\n" +
            // "    float zDist = 1.0 - ndc.z; // 1 is close (right up in your face,)\n" +
            // "    gl_PointSize = uThickness * zDist;\n" +
            "    gl_PointSize = uThickness;\n" +
            "    gl_Position =  position;\n" +
            "}";
        this.fragmentShaderCode = "precision mediump float;\n" +
            "uniform sampler2D tex0;\n" +
            "uniform vec4 color;\n" +
            "\n" +
            "void main() \n" +
            "{\n" +
            "   gl_FragColor = texture2D(tex0, gl_PointCoord) * color;\n" +
            "}";
    }
    fillUniformsAttributes() {
        this.uMvp = this.getUniform("uMvp");
        this.uThickness = this.getUniform("uThickness");
        this.aPosition = this.getAttrib("aPosition");
        this.tex0 = this.getUniform("tex0");
        this.color = this.getUniform("color");
    }
}
//# sourceMappingURL=PointSpriteColoredShader.js.map

class AtAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "#version 300 es\n" +
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
//# sourceMappingURL=AtAnimatedTextureChunkedShader.js.map

class LitAnimatedTextureChunkedShader extends DiffuseAnimatedTextureChunkedShader {
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
//# sourceMappingURL=LitAnimatedTextureChunkedShader.js.map

class SoftDiffuseColoredShader extends DiffuseShader {
    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "varying vec2 vTextureCoord;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "}";
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
            "   vec4 diffuse = texture2D(sTexture, vTextureCoord) * color;\n" + // particle base diffuse color
            // "   diffuse += vec4(0.0, 0.0, 1.0, 1.0);\n"+ // uncomment to visualize particle shape
            "   vec2 coords = gl_FragCoord.xy * uInvViewportSize;\n" + // calculate depth texture coordinates
            "   float geometryZ = calc_depth(texture2D(sDepth, coords).r);\n" + // lineriarize particle depth
            "   float sceneZ = calc_depth(gl_FragCoord.z);\n" + // lineriarize scene depth
            "   float a = clamp(geometryZ - sceneZ, 0.0, 1.0);\n" + // linear clamped diff between scene and particle depth
            "   float b = smoothstep(0.0, uTransitionSize, a);\n" + // apply smoothstep to make soft transition
            "   gl_FragColor = diffuse * b;\n" + // final color with soft edge
            // "   gl_FragColor *= pow(1.0 - gl_FragCoord.z, 0.3);\n" +
            // "   gl_FragColor = vec4(a, a, a, 1.0);\n" + // uncomment to visualize raw Z difference
            // "   gl_FragColor = vec4(b, b, b, 1.0);\n" + // uncomment to visualize blending coefficient
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
//# sourceMappingURL=SoftDiffuseColoredShader.js.map

class SoftDiffuseColoredAlphaShader extends SoftDiffuseColoredShader {
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
//# sourceMappingURL=SoftDiffuseColoredAlphaShader.js.map

class DiffuseAnimatedTextureChunkedColoredShader extends DiffuseAnimatedTextureChunkedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = "#version 300 es\n" +
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
//# sourceMappingURL=DiffuseAnimatedTextureChunkedColoredShader.js.map

class SkyShader extends DiffuseColoredShader {
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
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.color === undefined) {
            return;
        }
        const gl = renderer.gl;
        gl.uniform4f(this.color, this._color[0], this._color[1], this._color[2], this._color[3]);
        super.drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
}
//# sourceMappingURL=SkyShader.js.map

class DiffuseOneChannelShader extends DiffuseShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D sTexture;

            void main() {
                float color = texture2D(sTexture, vTextureCoord).r;
                gl_FragColor = vec4(color, color, color, 1.0);
            }`;
    }
}
//# sourceMappingURL=DiffuseOneChannelShader.js.map

class DepthAnimatedTextureChunkedShader extends BaseShader {
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
//# sourceMappingURL=DepthAnimatedTextureChunkedShader.js.map

class VertexVignetteShader extends BaseShader {
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
//# sourceMappingURL=VertexVignetteShader.js.map

const FOV_LANDSCAPE = 60.0; // FOV for landscape
const FOV_PORTRAIT = 80.0; // FOV for portrait
const YAW_COEFF_NORMAL = 200.0; // camera rotation time
const particlesCoordinates = [
    [0, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1.2, 0],
    [0, -1.2, 0],
    [1.2, 0, 0],
    [-1.2, 0, 0],
    [0, -6, 0],
    [2, -5, 0],
    [-2, -5, 0],
];
class Renderer extends BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.angleYaw = 0;
        this.loaded = false;
        this.fmSky = new FullModel();
        this.fmStripe = new FullModel();
        this.fmDust = new FullModel();
        this.fmBody = new FullModel();
        this.fmScythe = new FullModel();
        this.fmCloth = new FullModel();
        this.fmEyes = new FullModel();
        this.fmSmoke = new FullModel();
        this.fmVignette = new FullModel();
        this.Z_NEAR = 1.0;
        this.Z_FAR = 110.0;
        this.timerDustRotation = 0;
        this.DUST_ROTATION_SPEED = 18003333;
        this.timerDustFlickering = 0;
        this.DUST_FLICKERING_SPEED = 2100;
        this.timerCharacterAnimation = 0;
        this.REAPER_ANIMATION_PERIOD = 5000;
        this.timerSkyAnimation = 0;
        this.SKY_ANIMATION_PERIOD = 90000;
        this.timerSmokeMovement = 0;
        this.SMOKE_MOVEMENT_PERIOD = 8000;
        this.timerSmokeRotation = 0;
        this.SMOKE_ROTATION_PERIOD = 903333;
        this.timerSkyRotation = 0;
        this.SKY_ROTATION_PERIOD = 350333;
        this.timerGhostsRotation = 0;
        this.GHOSTS_ROTATION_PERIOD = 4200;
        this.timerGhostsRotation2 = 0;
        this.GHOSTS_ROTATION_PERIOD2 = 4100;
        this.timerEyes = 0;
        this.EYES_PERIOD = 2500;
        this.timerLightning = 0;
        this.LIGHTNING_PERIOD = 3500;
        this.SMOKE_SOFTNESS = 0.01;
        this.SMOKE_SCALE = 0.09;
        this.SMOKE_TRAVEL_Z = 16.0;
        this.ANIMATION_TEXTURE_WIDTH = 1000;
        this.REAPER_ANIMATION_TEXTURE_WIDTH = 512;
        this.animationsBody = {
            "idle1": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 51),
            "idle2": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 51),
            "fly": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 21),
            "fly-fast": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 16)
        };
        this.animationsScythe = {
            "idle1": new TextureAnimationChunked(608, 608, 51),
            "idle2": new TextureAnimationChunked(608, 608, 51),
            "fly": new TextureAnimationChunked(608, 608, 21),
            "fly-fast": new TextureAnimationChunked(608, 608, 16)
        };
        this.animationsEyes = {
            "idle1": new TextureAnimationChunked(36, 36, 51),
            "idle2": new TextureAnimationChunked(36, 36, 51),
            "fly": new TextureAnimationChunked(36, 36, 21),
            "fly-fast": new TextureAnimationChunked(36, 36, 16)
        };
        this.animationsCloth = {
            "idle1": new TextureAnimationChunked(664, 664, 51),
            "idle2": new TextureAnimationChunked(664, 664, 51),
            "fly": new TextureAnimationChunked(664, 664, 21),
            "fly-fast": new TextureAnimationChunked(664, 664, 16)
        };
        this.currentAnimation = "idle1";
        this.cameraMode = CameraMode.Random;
        this.currentRandomCamera = 0;
        this.matViewInverted = create();
        this.matViewInvertedTransposed = create();
        this.matTemp = create();
        this.cameraPosition = create$1();
        this.cameraRotation = create$1();
        this.CAMERAS = [
            {
                start: {
                    position: new Float32Array([20.63134765625, 0.04024043679237366, -23.309953689575195]),
                    rotation: new Float32Array([-1.037999153137207, 4.560023307800293, 0])
                },
                end: {
                    position: new Float32Array([20.027006149291992, 5.342957019805908, 30.2779598236084]),
                    rotation: new Float32Array([0.6720000505447388, 4.404022216796875, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-6.6900529861450195, 4.612008094787598, 50.24580383300781]),
                    rotation: new Float32Array([1.3187947273254395, 2.190007209777832, 0])
                },
                end: {
                    position: new Float32Array([-32.61750030517578, 24.84134292602539, 4.696905612945557]),
                    rotation: new Float32Array([-0.23520641028881073, 2.2440075874328613, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([32.16560745239258, -19.801870346069336, 10.339131355285645]),
                    rotation: new Float32Array([0.012000114656984806, -1, 0])
                },
                end: {
                    position: new Float32Array([-31.443674087524414, -25.470523834228516, 33.82668685913086]),
                    rotation: new Float32Array([0.5040005445480347, 0.9528526067733765, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([34.4621467590332, 25.997318267822266, 16.80156135559082]),
                    rotation: new Float32Array([0.17399989068508148, 4.0560197830200195, 0])
                },
                end: {
                    position: new Float32Array([-32.87525177001953, 22.77642250061035, 20.858415603637695]),
                    rotation: new Float32Array([0.21599987149238586, 2.2020068168640137, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-13.161895751953125, 6.17222785949707, 27.73927879333496]),
                    rotation: new Float32Array([0.5700000524520874, 2.0220019817352295, 0])
                },
                end: {
                    position: new Float32Array([-17.9815673828125, 4.7135090827941895, -0.5088852643966675]),
                    rotation: new Float32Array([-0.5280001759529114, 1.8480011224746704, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([16.19297218322754, -4.055665493011475, 25.375]),
                    rotation: new Float32Array([0.5220006108283997, 4.746006488800049, 0])
                },
                end: {
                    position: new Float32Array([13.601936340332031, 14.41900634765625, 1.7308120727539062]),
                    rotation: new Float32Array([-0.47400006651878357, 3.803999900817871, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-8.11626148223877, 6.703431129455566, 27.8272705078125]),
                    rotation: new Float32Array([0.5640001893043518, 2.082002878189087, 0])
                },
                end: {
                    position: new Float32Array([-15.641282081604004, 10.945764541625977, 9.242594718933105]),
                    rotation: new Float32Array([-0.2639997899532318, 2.0340025424957275, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-6.933125972747803, 12.842277526855469, 17.02661895751953]),
                    rotation: new Float32Array([-0.04200000315904617, 2.8091883659362793, 0.3])
                },
                end: {
                    position: new Float32Array([6.7748637199401855, 14.75560474395752, 7.144927024841309]),
                    rotation: new Float32Array([-0.39600011706352234, 3.5771920680999756, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-0.5569624304771423, 8.056137084960938, 13.825691223144531]),
                    rotation: new Float32Array([-0.6540009379386902, 2.7420051097869873, 0.1])
                },
                end: {
                    position: new Float32Array([-0.5569624304771423, 8.056137084960938, 13.825691223144531]),
                    rotation: new Float32Array([-0.07200095057487488, 3.1740081310272217, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([7.284486293792725, 12.943374633789062, 15.877676963806152]),
                    rotation: new Float32Array([0.04800054058432579, 3.660011053085327, 0])
                },
                end: {
                    position: new Float32Array([-6.318485736846924, 13.09317684173584, 10.776239395141602]),
                    rotation: new Float32Array([-0.16799943149089813, 2.6160080432891846, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([29.924358367919922, -20.450387954711914, 2.7626044750213623]),
                    rotation: new Float32Array([-0.19199976325035095, 5.320858955383301, 0])
                },
                end: {
                    position: new Float32Array([11.117116928100586, 20.80797004699707, 33.48508834838867]),
                    rotation: new Float32Array([0.708000123500824, 3.538848400115967, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([5.5241804122924805, 11.871227264404297, 12.655675888061523]),
                    rotation: new Float32Array([-0.26999998092651367, 3.264004707336426, 0])
                },
                end: {
                    position: new Float32Array([-7.568962574005127, 10.686423301696777, 15.796873092651367]),
                    rotation: new Float32Array([0.0599999763071537, 2.393998622894287, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-2.939835786819458, 9.555854797363281, 12.755476951599121]),
                    rotation: new Float32Array([-0.35400035977363586, 2.7383251190185547, 0])
                },
                end: {
                    position: new Float32Array([-15.307744026184082, 38.544288635253906, 1.1079256534576416]),
                    rotation: new Float32Array([-0.35400035977363586, 2.7383251190185547, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([8.92319107055664, 17.87936019897461, 20.506385803222656]),
                    rotation: new Float32Array([0.2940000295639038, 3.4799962043762207, 0])
                },
                end: {
                    position: new Float32Array([22.2241268157959, -3.5090885162353516, 8.84290885925293]),
                    rotation: new Float32Array([-0.14999999105930328, 4.853999614715576, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-12.525442123413086, 13.192499160766602, 23.48917007446289]),
                    rotation: new Float32Array([0.4800003468990326, 2.070006847381592, 0])
                },
                end: {
                    position: new Float32Array([-20.888025283813477, -13.184157371520996, 6.709957122802734]),
                    rotation: new Float32Array([-0.1259997934103012, 1.068004846572876, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([-1.4070744514465332, 10.23020076751709, 21.719236373901367]),
                    rotation: new Float32Array([0.7260005474090576, 3.0300018787384033, 0])
                },
                end: {
                    position: new Float32Array([-2.625640869140625, 21.179767608642578, -2.4872467517852783]),
                    rotation: new Float32Array([-0.5999994874000549, 3.0300018787384033, 0])
                },
                speedMultiplier: 1.0
            },
            {
                start: {
                    position: new Float32Array([13.535038948059082, 7.506402015686035, 24.7524356842041]),
                    rotation: new Float32Array([0.40200015902519226, 3.7320029735565186, 0])
                },
                end: {
                    position: new Float32Array([-8.367344856262207, 15.256627082824707, 9.666288375854492]),
                    rotation: new Float32Array([-0.34200000762939453, 2.724001407623291, 0])
                },
                speedMultiplier: 1.0
            },
        ];
        this.CAMERA_SPEED = 0.01;
        this.CAMERA_MIN_DURATION = 8000;
        this.cameraPositionInterpolator = new CameraPositionInterpolator();
        this.SCALE = 10;
        this.dustSpriteSize = 0;
        this.DUST_COLOR = { r: 10 / 256, g: 10 / 256, b: 10 / 256, a: 1 };
        this.DUST_SPRITE_SIZE = 0.006;
        this.DUST_SCALE = 0.16;
        this.lightningDirection = create$1();
        this.PRESETS = [
            {
                bodySuffix: "green",
                clothSuffix: "green",
                colorEyes: { r: 0.1, g: 0.8, b: 0.1, a: 1 },
                colorSky: { r: 0.38, g: 0.60, b: 0.4, a: 1 },
                colorSmoke: { r: 0.2, g: 0.5, b: 0.25, a: 0.35 }
            },
            {
                bodySuffix: "red",
                clothSuffix: "red",
                colorEyes: { r: 0.6, g: 0.1, b: 0.1, a: 1 },
                colorSky: { r: 0.65, g: 0.35, b: 0.32, a: 1 },
                colorSmoke: { r: 0.17, g: 0.22, b: 0.25, a: 0.8 }
            },
            {
                bodySuffix: "white",
                clothSuffix: "blue",
                colorEyes: { r: 0.13, g: 0.13, b: 0.9, a: 1 },
                colorSky: { r: 0.51, g: 0.72, b: 0.9, a: 1 },
                colorSmoke: { r: 0.8, g: 0.9, b: 0.99, a: 0.25 }
            },
            {
                bodySuffix: "brown",
                clothSuffix: "yellow",
                colorEyes: { r: 0.7, g: 0.6, b: 0.4, a: 1 },
                colorSky: { r: 0.95, g: 0.9, b: 0.53, a: 1 },
                colorSmoke: { r: 0.6, g: 0.6, b: 0.2, a: 0.3 }
            },
            {
                bodySuffix: "brown",
                clothSuffix: "brown",
                colorEyes: { r: 0.7, g: 0.6, b: 0.4, a: 1 },
                colorSky: { r: 0.72, g: 0.7, b: 0.43, a: 1 },
                colorSmoke: { r: 0.17, g: 0.22, b: 0.25, a: 0.8 }
            }
        ];
        this.PRESET = this.PRESETS[4];
        this.useLightning = true;
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED;
        this.cameraPositionInterpolator.minDuration = this.CAMERA_MIN_DURATION;
        this.randomizeCamera();
        document.addEventListener("keypress", event => {
            if (event.key === "1") {
                this.CAMERAS[0].start = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
            else if (event.key === "2") {
                this.CAMERAS[0].end = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
        });
        this.randomizeLightning();
    }
    set lightning(value) {
        this.useLightning = value;
    }
    logCamera() {
        const camera = this.CAMERAS[0];
        console.log(`
        {
            start: {
                position: new Float32Array([${camera.start.position.toString()}]),
                rotation: new Float32Array([${camera.start.rotation.toString()}])
            },
            end: {
                position: new Float32Array([${camera.end.position.toString()}]),
                rotation: new Float32Array([${camera.end.rotation.toString()}])
            },
            speedMultiplier: 1.0
        },
        `);
    }
    setCustomCamera(camera, position, rotation) {
        this.customCamera = camera;
        if (position !== undefined) {
            this.cameraPosition = position;
        }
        if (rotation !== undefined) {
            this.cameraRotation = rotation;
        }
    }
    resetCustomCamera() {
        this.customCamera = undefined;
    }
    onBeforeInit() {
    }
    onAfterInit() {
    }
    onInitError() {
        var _a, _b;
        (_a = document.getElementById("canvasGL")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("alertError")) === null || _b === void 0 ? void 0 : _b.classList.remove("hidden");
    }
    initShaders() {
        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderDiffuseAnimatedTexture = new DiffuseAnimatedTextureShader(this.gl);
        this.shaderDiffuseAnimatedTextureChunked = new DiffuseAnimatedTextureChunkedShader(this.gl);
        this.shaderDiffuseAnimatedTextureChunkedColored = new DiffuseAnimatedTextureChunkedColoredShader(this.gl);
        this.shaderAtAnimatedTextureChunked = new AtAnimatedTextureChunkedShader(this.gl);
        this.shaderLitAnimatedTextureChunked = new LitAnimatedTextureChunkedShader(this.gl);
        this.shaderDiffuseAlpha = new DiffuseAlphaShader(this.gl);
        this.shaderDiffuseColored = new DiffuseColoredShader(this.gl);
        this.shaderDiffuseOneChannel = new DiffuseOneChannelShader(this.gl);
        this.shaderBend = new BendShader(this.gl);
        this.shaderPointSpriteColored = new PointSpriteColoredShader(this.gl);
        this.shaderSoftDiffuseColored = new SoftDiffuseColoredShader(this.gl);
        this.shaderSoftDiffuseColoredAlpha = new SoftDiffuseColoredAlphaShader(this.gl);
        this.shaderSky = new SkyShader(this.gl);
        this.shaderDepthAnimated = new DepthAnimatedTextureChunkedShader(this.gl);
        this.shaderVignette = new VertexVignetteShader(this.gl);
    }
    async loadFloatingPointTexture(url, gl, width, height, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false, type = "fp16") {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const dataView = type === "fp16"
            ? new Uint16Array(data)
            : new Int8Array(data);
        // const dataView = new Float32Array(data);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.checkGlError("loadFloatingPointTexture 0");
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, type === "fp16" ? gl.RGB16F : gl.RGB8_SNORM, width, height, 0, gl.RGB, type === "fp16" ? gl.HALF_FLOAT : gl.BYTE, dataView);
        this.checkGlError("loadFloatingPointTexture 1");
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        if (clamp === true) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
        this.checkGlError("loadFloatingPointTexture 2");
        gl.bindTexture(gl.TEXTURE_2D, null);
        console.log(`Loaded texture ${url} [${width}x${height}]`);
        return texture;
    }
    async loadData() {
        var _a, _b;
        const promiseModels = Promise.all([
            this.fmSky.load("data/models/sky", this.gl),
            this.fmStripe.load("data/models/stripe-optimized-1", this.gl),
            this.fmDust.load("data/models/particles_20", this.gl),
            this.fmBody.load("data/models/body", this.gl),
            this.fmScythe.load("data/models/scythe", this.gl),
            this.fmCloth.load("data/models/cloth", this.gl),
            this.fmEyes.load("data/models/eyes", this.gl),
            this.fmSmoke.load("data/models/smoke100", this.gl),
            this.fmVignette.load("data/models/vignette-round-vntao", this.gl)
        ]);
        const promiseTextures = Promise.all([
            UncompressedTextureLoader.load("data/textures/sky.webp", this.gl, undefined, undefined, false),
            UncompressedTextureLoader.load("data/textures/particle1.webp", this.gl, undefined, undefined, false),
            UncompressedTextureLoader.load("data/textures/displacement.webp", this.gl, undefined, undefined, false),
            UncompressedTextureLoader.load("data/textures/dust.webp", this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            UncompressedTextureLoader.load(`data/textures/body-${this.PRESET.bodySuffix}.webp`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            UncompressedTextureLoader.load(`data/textures/cloth-${this.PRESET.clothSuffix}.webp`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/body-positions.rgb.fp16`, this.gl, this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/body-normals.rgb.s8`, this.gl, this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "snorm8"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/scythe-positions.rgb.fp16`, this.gl, this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/scythe-normals.rgb.s8`, this.gl, this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "snorm8"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/cloth-positions.rgb.fp16`, this.gl, this.animationsCloth[this.currentAnimation].textureWidth, this.animationsCloth[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/eyes.rgb.fp16`, this.gl, this.animationsEyes[this.currentAnimation].textureWidth, this.animationsEyes[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true),
            UncompressedTextureLoader.load("data/textures/eye_alpha.webp", this.gl),
            UncompressedTextureLoader.load("data/textures/smoke.webp", this.gl),
            UncompressedTextureLoader.load("data/textures/vignette.webp", this.gl)
        ]);
        const [models, textures] = await Promise.all([promiseModels, promiseTextures]);
        [
            this.textureSky,
            this.textureParticle,
            this.textureDisplacement,
            this.textureDust,
            this.textureBody,
            this.textureCloth,
            this.textureBodyAnim,
            this.textureBodyNormalsAnim,
            this.textureScytheAnim,
            this.textureScytheNormalsAnim,
            this.textureClothAnim,
            this.textureEyesAnim,
            this.textureEyes,
            this.textureSmoke,
            this.textureVignette
        ] = textures;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureBody);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureCloth);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.initOffscreen();
        this.initVignette();
        this.loaded = true;
        console.log("Loaded all assets");
        (_a = document.getElementById("message")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("canvasGL")) === null || _b === void 0 ? void 0 : _b.classList.remove("transparent");
        setTimeout(() => { var _a; return (_a = document.querySelector(".promo")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
        setTimeout(() => { var _a; return (_a = document.querySelector("#toggleFullscreen")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
    }
    initOffscreen() {
        if (this.canvas === undefined) {
            return;
        }
        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false);
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height);
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");
        console.log("Initialized offscreen FBO.");
    }
    checkGlError(operation) {
        // In production code, override this to do nothing for better performance
    }
    initVignette() {
        ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0,
            1.0, -1.0, -5.0, 1.0, 0.0,
            -1.0, 1.0, -5.0, 0.0, 1.0,
            1.0, 1.0, -5.0, 1.0, 1.0,
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }
    async changeScene() {
        if (this.currentAnimation === "idle1") {
            this.currentAnimation = "idle2";
        }
        else if (this.currentAnimation === "idle2") {
            this.currentAnimation = "fly";
        }
        else if (this.currentAnimation === "fly") {
            this.currentAnimation = "fly-fast";
        }
        else if (this.currentAnimation === "fly-fast") {
            this.currentAnimation = "idle1";
        }
        [
            this.textureBodyAnim,
            this.textureBodyNormalsAnim,
            this.textureScytheAnim,
            this.textureScytheNormalsAnim,
            this.textureClothAnim,
            this.textureEyesAnim,
        ] = await Promise.all([
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/body-positions.rgb.fp16`, this.gl, this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "fp16"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/body-normals.rgb.s8`, this.gl, this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "snorm8"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/scythe-positions.rgb.fp16`, this.gl, this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "fp16"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/scythe-normals.rgb.s8`, this.gl, this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true, "snorm8"),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/cloth-positions.rgb.fp16`, this.gl, this.animationsCloth[this.currentAnimation].textureWidth, this.animationsCloth[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true),
            this.loadFloatingPointTexture(`data/textures/anims/${this.currentAnimation}/eyes.rgb.fp16`, this.gl, this.animationsEyes[this.currentAnimation].textureWidth, this.animationsEyes[this.currentAnimation].textureHeight, this.gl.NEAREST, this.gl.NEAREST, true)
        ]);
    }
    animate() {
        const timeNow = new Date().getTime();
        if (this.lastTime != 0) {
            const elapsed = timeNow - this.lastTime;
            this.angleYaw += elapsed / YAW_COEFF_NORMAL;
            this.angleYaw %= 360.0;
            this.timerDustRotation = (timeNow % this.DUST_ROTATION_SPEED) / this.DUST_ROTATION_SPEED;
            this.timerDustFlickering = (timeNow % this.DUST_FLICKERING_SPEED) / this.DUST_FLICKERING_SPEED;
            const prevLightning = this.timerLightning;
            this.timerCharacterAnimation = (timeNow % this.REAPER_ANIMATION_PERIOD) / this.REAPER_ANIMATION_PERIOD;
            this.timerSkyAnimation = (timeNow % this.SKY_ANIMATION_PERIOD) / this.SKY_ANIMATION_PERIOD;
            this.timerSmokeMovement = (timeNow % this.SMOKE_MOVEMENT_PERIOD) / this.SMOKE_MOVEMENT_PERIOD;
            this.timerSmokeRotation = (timeNow % this.SMOKE_ROTATION_PERIOD) / this.SMOKE_ROTATION_PERIOD;
            this.timerSkyRotation = (timeNow % this.SKY_ROTATION_PERIOD) / this.SKY_ROTATION_PERIOD;
            this.timerGhostsRotation = (timeNow % this.GHOSTS_ROTATION_PERIOD) / this.GHOSTS_ROTATION_PERIOD;
            this.timerGhostsRotation2 = (timeNow % this.GHOSTS_ROTATION_PERIOD2) / this.GHOSTS_ROTATION_PERIOD2;
            this.timerEyes = (timeNow % this.EYES_PERIOD) / this.EYES_PERIOD;
            if (this.useLightning) {
                this.timerLightning = (timeNow % this.LIGHTNING_PERIOD) / this.LIGHTNING_PERIOD;
            }
            this.cameraPositionInterpolator.iterate(timeNow);
            if (this.cameraPositionInterpolator.timer === 1.0) {
                this.randomizeCamera();
            }
            if (this.timerLightning < prevLightning) {
                this.randomizeLightning();
            }
        }
        this.lastTime = timeNow;
    }
    /** Calculates projection matrix */
    setCameraFOV(multiplier) {
        var ratio;
        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        }
        else {
            ratio = 1.0;
        }
        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        }
        else {
            fov = FOV_PORTRAIT * multiplier;
        }
        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
        this.dustSpriteSize = Math.min(this.gl.canvas.height, this.gl.canvas.width) * this.DUST_SPRITE_SIZE;
    }
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    positionCamera(a) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }
        if (this.cameraMode === CameraMode.Random) {
            this.mVMatrix = this.cameraPositionInterpolator.matrix;
            this.cameraPosition[0] = this.cameraPositionInterpolator.cameraPosition[0];
            this.cameraPosition[1] = this.cameraPositionInterpolator.cameraPosition[1];
            this.cameraPosition[2] = this.cameraPositionInterpolator.cameraPosition[2];
        }
        else {
            const a = this.angleYaw / 360 * Math.PI * 2;
            const sina = Math.sin(a);
            const cosa = Math.cos(a);
            const cosa2 = Math.cos(a * 2);
            this.cameraPosition[0] = sina * 23;
            this.cameraPosition[1] = cosa * 23;
            this.cameraPosition[2] = 12 + cosa2 * 6;
            lookAt(this.mVMatrix, this.cameraPosition, // eye
            [0, 0, 12], // center
            [0, 0, 1] // up vector
            );
        }
    }
    /** Issues actual draw calls */
    drawScene() {
        if (!this.loaded) {
            return;
        }
        this.positionCamera(0.0);
        this.setCameraFOV(1.0);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.colorMask(false, false, false, false);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen.width, this.fboOffscreen.height);
        this.gl.depthMask(true);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawDepthObjects();
        this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // This differs from OpenGL ES
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawSceneObjects();
        // this.drawTestDepth();
    }
    drawTestDepth() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.textureOffscreenDepth, this.shaderDiffuse.sTexture);
        this.drawVignette(this.shaderDiffuse);
    }
    drawSceneVignette() {
        this.shaderDiffuseOneChannel.use();
        this.setTexture2D(0, this.textureVignette, this.shaderDiffuseOneChannel.sTexture);
        this.drawVignette(this.shaderDiffuseOneChannel);
    }
    drawVignetteObject() {
        if (this.shaderVignette === undefined) {
            return;
        }
        this.shaderVignette.use();
        this.gl.uniform4f(this.shaderVignette.color0, 0.33, 0.33, 0.33, 1);
        this.gl.uniform4f(this.shaderVignette.color1, 1.0, 1.0, 1.0, 1);
        this.shaderVignette.drawVignette(this, this.fmVignette);
    }
    drawVignette(shader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 20, 4 * 3);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    drawDepthObjects() {
        var _a;
        if (this.shaderDepthAnimated === undefined
            || this.shaderDiffuseAnimatedTexture === undefined
            || this.shaderDiffuseAnimatedTextureChunked === undefined
            || this.shaderAtAnimatedTextureChunked === undefined
            || this.shaderLitAnimatedTextureChunked === undefined
            || this.shaderDiffuseColored === undefined
            || this.shaderBend == undefined) {
            console.log("undefined shaders");
            return;
        }
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        (_a = this.shaderDepthAnimated) === null || _a === void 0 ? void 0 : _a.use();
        this.drawAnimated(this.shaderDepthAnimated, this.timerCharacterAnimation, this.animationsBody[this.currentAnimation], this.fmBody, this.textureBodyAnim, this.REAPER_ANIMATION_TEXTURE_WIDTH, "animateStartToEnd");
        this.drawAnimated(this.shaderDepthAnimated, this.timerCharacterAnimation, this.animationsScythe[this.currentAnimation], this.fmScythe, this.textureScytheAnim, 608, "animateStartToEnd");
        this.gl.disable(this.gl.CULL_FACE);
        this.shaderAtAnimatedTextureChunked.use();
        this.setTexture2D(1, this.textureCloth, this.shaderAtAnimatedTextureChunked.sTexture);
        this.drawAnimated(this.shaderAtAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsCloth[this.currentAnimation], this.fmCloth, this.textureClothAnim, 664, "animateStartToEnd");
        this.gl.enable(this.gl.CULL_FACE);
    }
    drawSceneObjects() {
        if (this.shaderDiffuse === undefined
            || this.shaderDiffuseAlpha === undefined
            || this.shaderDiffuseAnimatedTexture === undefined
            || this.shaderDiffuseAnimatedTextureChunked === undefined
            || this.shaderDiffuseAnimatedTextureChunkedColored === undefined
            || this.shaderAtAnimatedTextureChunked === undefined
            || this.shaderLitAnimatedTextureChunked === undefined
            || this.shaderDiffuseColored === undefined
            || this.shaderSoftDiffuseColored === undefined
            || this.shaderSky === undefined
            || this.shaderBend == undefined) {
            console.log("undefined shaders");
            return;
        }
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        const light = this.getLightningIntensity();
        this.gl.disable(this.gl.CULL_FACE);
        this.shaderAtAnimatedTextureChunked.use();
        this.setTexture2D(1, this.textureCloth, this.shaderAtAnimatedTextureChunked.sTexture);
        this.drawAnimated(this.shaderAtAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsCloth[this.currentAnimation], this.fmCloth, this.textureClothAnim, 664, "animateStartToEnd");
        this.gl.enable(this.gl.CULL_FACE);
        this.shaderLitAnimatedTextureChunked.use();
        if (light > 0) {
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightDir, this.lightningDirection[0], this.lightningDirection[1], this.lightningDirection[2], 0.0);
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightColor, 1.0, 1.0, 1.0, 0.0);
            this.gl.uniform1f(this.shaderLitAnimatedTextureChunked.uLightIntensity, light);
        }
        else {
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightDir, 0, 0, -1, 0);
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightColor, -1.0, -1.0, -1.0, 0.0);
            this.gl.uniform1f(this.shaderLitAnimatedTextureChunked.uLightIntensity, 0.7);
        }
        this.setTexture2D(1, this.textureBody, this.shaderLitAnimatedTextureChunked.sTexture);
        this.setTexture2D(2, this.textureBodyNormalsAnim, this.shaderLitAnimatedTextureChunked.sNormals);
        this.drawAnimated(this.shaderLitAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsBody[this.currentAnimation], this.fmBody, this.textureBodyAnim, this.REAPER_ANIMATION_TEXTURE_WIDTH, "animateStartToEnd");
        this.setTexture2D(2, this.textureScytheNormalsAnim, this.shaderLitAnimatedTextureChunked.sNormals);
        this.drawAnimated(this.shaderLitAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsScythe[this.currentAnimation], this.fmScythe, this.textureScytheAnim, 608, "animateStartToEnd");
        this.gl.depthMask(false);
        this.shaderDiffuseAnimatedTextureChunkedColored.use();
        const eyesOpacity = this.getEyesOpacity();
        this.gl.uniform4f(this.shaderDiffuseAnimatedTextureChunkedColored.uColor, this.PRESET.colorEyes.r * eyesOpacity, this.PRESET.colorEyes.g * eyesOpacity, this.PRESET.colorEyes.b * eyesOpacity, this.PRESET.colorEyes.a * eyesOpacity);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.setTexture2D(1, this.textureEyes, this.shaderDiffuseAnimatedTextureChunkedColored.sTexture);
        this.drawAnimated(this.shaderDiffuseAnimatedTextureChunkedColored, this.timerCharacterAnimation, this.animationsEyes[this.currentAnimation], this.fmEyes, this.textureEyesAnim, 36, "animateStartToEnd");
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
        this.gl.enable(this.gl.CULL_FACE);
        // Sky is a distant object drawn one of the last, it doesn't add useful depth information.
        // Reduce memory bandwidth by disabling writing to z-buffer.
        this.gl.depthMask(false);
        this.shaderSky.use();
        this.setTexture2D(0, this.textureSky, this.shaderSky.sTexture);
        this.setTexture2D(1, this.textureDisplacement, this.shaderSky.sDisplacement);
        this.shaderSky.setColor(this.PRESET.colorSky.r, this.PRESET.colorSky.g, this.PRESET.colorSky.b, this.PRESET.colorSky.a);
        this.gl.uniform1f(this.shaderSky.uTime, this.timerSkyAnimation);
        this.gl.uniform1f(this.shaderSky.uLightning, light * 5);
        this.gl.uniform4f(this.shaderSky.uLightningExponent, 3.3, 3.3, 3.3, 3.3);
        this.shaderSky.drawModel(this, this.fmSky, this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2], 0, 0, this.timerSkyRotation * Math.PI * 2, 1, 1, 1);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.drawParticles();
        this.drawGhosts();
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.drawDust(light);
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.SRC_COLOR);
        this.gl.blendFunc(this.gl.ZERO, this.gl.SRC_COLOR);
        this.drawVignetteObject();
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }
    drawParticles() {
        if (this.shaderSoftDiffuseColored === undefined || this.shaderSoftDiffuseColoredAlpha === undefined) {
            console.log("undefined shaders");
            return;
        }
        this.shaderSoftDiffuseColoredAlpha.use();
        this.initDepthReadShader(this.shaderSoftDiffuseColoredAlpha);
        this.setTexture2D(0, this.textureSmoke, this.shaderSoftDiffuseColoredAlpha.sTexture);
        for (let i = 0; i < particlesCoordinates.length; i++) {
            const coordinates = particlesCoordinates[i];
            const timer = (this.timerSmokeMovement + i * 13.37) % 1.0;
            const rotation = i * 35 + this.timerSmokeRotation * (i % 2 === 0 ? 360 : -360); // TODO check units
            let x = coordinates[0];
            let y = coordinates[1];
            let z = coordinates[2] + timer * this.SMOKE_TRAVEL_Z;
            const scale = timer * this.SMOKE_SCALE;
            const opacity = this.smootherstep(0, 0.4, timer) * (1 - this.smootherstep(0.7, 1.0, timer));
            z += 4;
            this.gl.uniform4f(this.shaderSoftDiffuseColoredAlpha.color, this.PRESET.colorSmoke.r, this.PRESET.colorSmoke.g, this.PRESET.colorSmoke.b, this.PRESET.colorSmoke.a * opacity);
            this.drawDiffuseVBOFacingCamera(this.shaderSoftDiffuseColoredAlpha, this.fmSmoke, x, y, z, scale, 1, 1, rotation);
        }
        for (let i = 0; i < particlesCoordinates.length / 2; i++) {
            const coordinates = particlesCoordinates[i];
            const timer = (this.timerSmokeMovement + i * 13.37) % 1.0;
            const rotation = i * 35 + this.timerSmokeRotation * (i % 2 === 0 ? 360 : -360); // TODO check units
            let x = coordinates[0];
            let y = coordinates[1];
            let z = coordinates[2] + timer * this.SMOKE_TRAVEL_Z * -0.65;
            const scale = timer * this.SMOKE_SCALE * 1.4;
            const opacity = 0.6 * this.smootherstep(0, 0.4, timer) * (1 - this.smootherstep(0.7, 1.0, timer));
            z += 15;
            this.gl.uniform4f(this.shaderSoftDiffuseColoredAlpha.color, this.PRESET.colorSmoke.r, this.PRESET.colorSmoke.g, this.PRESET.colorSmoke.b, this.PRESET.colorSmoke.a * opacity);
            this.drawDiffuseVBOFacingCamera(this.shaderSoftDiffuseColoredAlpha, this.fmSmoke, x, y, z, scale, 1, 1, rotation);
        }
    }
    drawGhosts() {
        if (this.shaderBend === undefined) {
            return;
        }
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.depthMask(false);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.shaderBend.use();
        this.shaderBend.setColor(0, 0, 0, 1);
        this.setTexture2D(0, this.textureParticle, this.shaderBend.sTexture);
        this.shaderBend.setColor(0.05, 0.05, 0.05, 0.35);
        this.shaderBend.setRadius(9 + 3 * (1 + Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.shaderBend.setLength(0.3);
        this.shaderBend.drawModel(this, this.fmStripe, 0, 0, 12 + 0.4 * Math.sin(this.timerGhostsRotation * Math.PI * 4), 0.2, 0.3, (1.5 - this.timerGhostsRotation) * Math.PI * 2, 1.0, 1.0, 0.18 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.shaderBend.setRadius(9.5 + 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.3) * Math.PI * 2)));
        this.shaderBend.drawModel(this, this.fmStripe, 0, 0, 10 - 0.4 * Math.sin((this.timerGhostsRotation + 0.3) * Math.PI * 4), -0.1, 0.3, (0.73 - this.timerGhostsRotation) * Math.PI * 2, 1.0, 1.0, 0.2 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.shaderBend.setRadius(10 - 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.55) * Math.PI * 2)));
        this.shaderBend.setLength(-0.3);
        this.shaderBend.drawModel(this, this.fmStripe, 0, 0, 15 + 0.3 * Math.sin((this.timerGhostsRotation + 0.6) * Math.PI * 4), -0.2, -0.3, (this.timerGhostsRotation) * Math.PI * 2, 1.0, 1.0, 0.2 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.shaderBend.setRadius(8 + 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.83) * Math.PI * 2)));
        this.shaderBend.drawModel(this, this.fmStripe, 0, 0, 7 - 0.3 * Math.sin((this.timerGhostsRotation + 0.8) * Math.PI * 4), 0.1, -0.3, (1.3 + this.timerGhostsRotation) * Math.PI * 2, 1.0, 1.0, 0.15 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.gl.enable(this.gl.CULL_FACE);
    }
    drawDust(lightIntensity) {
        if (this.shaderPointSpriteColored === undefined) {
            return;
        }
        const a = this.timerDustRotation * 360;
        const b = -this.timerDustRotation * 360 * 2;
        const flickering1 = 0.5 + Math.sin(this.timerDustFlickering * Math.PI * 2) / 2;
        const flickering2 = 0.5 + Math.sin((this.timerDustFlickering + 0.3) * Math.PI * 2) / 2;
        const flickering3 = 0.5 + Math.sin((this.timerDustFlickering + 0.5) * Math.PI * 2) / 2;
        const flickering4 = 0.5 + Math.sin((this.timerDustFlickering + 0.6) * Math.PI * 2) / 2;
        this.shaderPointSpriteColored.use();
        this.setTexture2D(0, this.textureDust, this.shaderPointSpriteColored.tex0);
        this.gl.uniform1f(this.shaderPointSpriteColored.uThickness, this.dustSpriteSize);
        const colorR = this.DUST_COLOR.r * lightIntensity;
        const colorG = this.DUST_COLOR.g * lightIntensity;
        const colorB = this.DUST_COLOR.b * lightIntensity;
        this.gl.uniform4f(this.shaderPointSpriteColored.color, this.DUST_COLOR.r * flickering1 + colorR, this.DUST_COLOR.g * flickering1 + colorG, this.DUST_COLOR.b * flickering1 + colorB, this.DUST_COLOR.a);
        this.drawPointSpritesVBOTranslatedRotatedScaled(this.shaderPointSpriteColored, this.fmDust, 0, 2, 11, a, b, a, this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE);
        this.gl.uniform4f(this.shaderPointSpriteColored.color, this.DUST_COLOR.r * flickering2 + colorR, this.DUST_COLOR.g * flickering2 + colorG, this.DUST_COLOR.b * flickering2 + colorB, this.DUST_COLOR.a);
        this.drawPointSpritesVBOTranslatedRotatedScaled(this.shaderPointSpriteColored, this.fmDust, 1, -2, 12, b, -a, b, this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE);
        this.gl.uniform4f(this.shaderPointSpriteColored.color, this.DUST_COLOR.r * flickering3 + colorR, this.DUST_COLOR.g * flickering3 + colorG, this.DUST_COLOR.b * flickering3 + colorB, this.DUST_COLOR.a);
        this.drawPointSpritesVBOTranslatedRotatedScaled(this.shaderPointSpriteColored, this.fmDust, 3, -1, 13, -b, -a, -b, this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE);
        this.gl.uniform4f(this.shaderPointSpriteColored.color, this.DUST_COLOR.r * flickering4 + colorR, this.DUST_COLOR.g * flickering4 + colorG, this.DUST_COLOR.b * flickering4 + colorB, this.DUST_COLOR.a);
        this.drawPointSpritesVBOTranslatedRotatedScaled(this.shaderPointSpriteColored, this.fmDust, 2, -2, 14, -a, -a, b, this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE);
    }
    drawAnimated(shader, timer, animation, model, textureAnimation, animationTextureWidth = this.ANIMATION_TEXTURE_WIDTH, animationType = "animateStartEndStart") {
        this.gl.uniform1i(shader.uTextureWidthInt, animationTextureWidth);
        this.setTexture2D(0, textureAnimation, shader.sPositions);
        this.gl.uniform4f(shader.uTexelSizes, animation.textureWidth, animation.texelHalfWidth, animation[animationType](timer), animation.chunkSize);
        this.gl.uniform1f(shader.uTexelHeight, 1.0 / animation.textureHeight);
        shader.drawModel(this, model, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    randomizeCamera() {
        this.currentRandomCamera = (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (this.CAMERAS.length - 2))) % this.CAMERAS.length;
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED * this.CAMERAS[this.currentRandomCamera].speedMultiplier;
        this.cameraPositionInterpolator.position = this.CAMERAS[this.currentRandomCamera];
        this.cameraPositionInterpolator.reset();
    }
    randomizeLightning() {
        random(this.lightningDirection, 1);
    }
    drawPointSpritesVBOTranslatedRotatedScaled(shader, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        model.bindBuffers(this.gl);
        this.gl.enableVertexAttribArray(shader.aPosition);
        this.gl.vertexAttribPointer(shader.aPosition, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        this.gl.uniformMatrix4fv(shader.uMvp, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.POINTS, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
    }
    drawDiffuseVBOFacingCamera(shader, model, tx, ty, tz, sx, sy, sz, rotation) {
        model.bindBuffers(this.gl);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }
    calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation) {
        identity(this.mMMatrix);
        translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        rotateZ$1(this.mMVPMatrix, this.mMVPMatrix, rotation);
        multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    resetMatrixRotations(matrix) {
        const d = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1] + matrix[2] * matrix[2]);
        matrix[0] = d;
        matrix[4] = 0;
        matrix[8] = 0;
        matrix[1] = 0;
        matrix[5] = d;
        matrix[9] = 0;
        matrix[2] = 0;
        matrix[6] = 0;
        matrix[10] = d;
        matrix[3] = 0;
        matrix[7] = 0;
        matrix[11] = 0;
        matrix[15] = 1;
    }
    initDepthReadShader(shader) {
        this.gl.uniform2f(shader.cameraRange, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize, this.SMOKE_SOFTNESS);
        this.setTexture2D(2, this.textureOffscreenDepth, shader.sDepth);
    }
    smootherstep(edge0, edge1, x) {
        x = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * x * (x * (x * 6 - 15) + 10);
    }
    getEyesOpacity() {
        const x = this.timerEyes * Math.PI * 2;
        return 0.125 + (Math.sin(x) + 1) * 0.5;
    }
    getLightningIntensity() {
        const x = this.timerLightning * Math.PI * 2;
        const wave = Math.sin(x * 0.2) - Math.cos(x * 2.34) + Math.sin(x * 15.13) + Math.cos(x * 23.55) - 2.0;
        return wave > 0 ? wave : 0;
    }
}

/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
class FpsCamera {
    constructor(options) {
        var _a, _b;
        this._dirty = true;
        this._angles = create$1();
        this._position = create$1();
        this.speed = 100;
        this.rotationSpeed = 0.025;
        this._cameraMat = create();
        this._viewMat = create();
        this.projectionMat = create();
        this.pressedKeys = new Array();
        this.canvas = options.canvas;
        this.speed = (_a = options.movementSpeed) !== null && _a !== void 0 ? _a : 100;
        this.rotationSpeed = (_b = options.rotationSpeed) !== null && _b !== void 0 ? _b : 0.025;
        // Set up the appropriate event hooks
        let moving = false;
        let lastX, lastY;
        window.addEventListener("keydown", event => this.pressedKeys[event.keyCode] = true);
        window.addEventListener("keyup", event => this.pressedKeys[event.keyCode] = false);
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
        this.canvas.addEventListener('mousedown', event => {
            if (event.which === 3) {
                moving = true;
            }
            lastX = event.pageX;
            lastY = event.pageY;
        });
        this.canvas.addEventListener('mousemove', event => {
            if (moving) {
                let xDelta = event.pageX - lastX;
                let yDelta = event.pageY - lastY;
                lastX = event.pageX;
                lastY = event.pageY;
                this.angles[1] += xDelta * this.rotationSpeed;
                if (this.angles[1] < 0) {
                    this.angles[1] += Math.PI * 2;
                }
                if (this.angles[1] >= Math.PI * 2) {
                    this.angles[1] -= Math.PI * 2;
                }
                this.angles[0] += yDelta * this.rotationSpeed;
                if (this.angles[0] < -Math.PI * 0.5) {
                    this.angles[0] = -Math.PI * 0.5;
                }
                if (this.angles[0] > Math.PI * 0.5) {
                    this.angles[0] = Math.PI * 0.5;
                }
                this._dirty = true;
            }
        });
        this.canvas.addEventListener('mouseup', event => moving = false);
    }
    get angles() {
        return this._angles;
    }
    set angles(value) {
        this._angles = value;
        this._dirty = true;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this._dirty = true;
    }
    get viewMat() {
        if (this._dirty) {
            var mv = this._viewMat;
            identity(mv);
            rotateX$1(mv, mv, this.angles[0] - Math.PI / 2.0);
            rotateZ$1(mv, mv, this.angles[1]);
            rotateY$1(mv, mv, this.angles[2]);
            translate(mv, mv, [-this.position[0], -this.position[1], -this.position[2]]);
            this._dirty = false;
        }
        return this._viewMat;
    }
    update(frameTime) {
        const dir = create$1();
        let speed = (this.speed / 1000) * frameTime;
        if (this.pressedKeys[16]) { // Shift, speed up
            speed *= 5;
        }
        // This is our first person movement code. It's not really pretty, but it works
        if (this.pressedKeys['W'.charCodeAt(0)]) {
            dir[1] += speed;
        }
        if (this.pressedKeys['S'.charCodeAt(0)]) {
            dir[1] -= speed;
        }
        if (this.pressedKeys['A'.charCodeAt(0)]) {
            dir[0] -= speed;
        }
        if (this.pressedKeys['D'.charCodeAt(0)]) {
            dir[0] += speed;
        }
        if (this.pressedKeys[32]) { // Space, moves up
            dir[2] += speed;
        }
        if (this.pressedKeys['C'.charCodeAt(0)]) { // C, moves down
            dir[2] -= speed;
        }
        if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
            let cam = this._cameraMat;
            identity(cam);
            rotateX$1(cam, cam, this.angles[0]);
            rotateZ$1(cam, cam, this.angles[1]);
            invert(cam, cam);
            transformMat4(dir, dir, cam);
            // Move the camera in the direction we are facing
            add(this.position, this.position, dir);
            this._dirty = true;
        }
    }
}
//# sourceMappingURL=FpsCamera.js.map

var MovementMode;
(function (MovementMode) {
    MovementMode[MovementMode["Free"] = 0] = "Free";
    MovementMode[MovementMode["Predefined"] = 1] = "Predefined";
})(MovementMode || (MovementMode = {}));
class FreeMovement {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.matCamera = create();
        this.matInvCamera = new Float32Array(16);
        this.vec3Eye = new Float32Array(3);
        this.vec3Rotation = new Float32Array(3);
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }
    setupControls() {
        document.addEventListener("keypress", (event) => {
            var _a;
            if (event.code === "Enter") {
                if (this.mode === MovementMode.Predefined) {
                    this.matCamera = clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;
                    invert(this.matInvCamera, this.matCamera);
                    getTranslation(this.vec3Eye, this.matInvCamera);
                    normalize$3(this.vec3Rotation, this.vec3Eye);
                    scale$1(this.vec3Rotation, this.vec3Rotation, -1);
                    this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera(this.options);
                    this.fpsCamera.position = this.vec3Eye;
                    const callback = (time) => {
                        if (this.mode !== MovementMode.Free) {
                            return;
                        }
                        this.fpsCamera.update(16);
                        this.matCamera = this.fpsCamera.viewMat;
                        this.renderer.setCustomCamera(this.matCamera, this.fpsCamera.position, this.fpsCamera.angles);
                        requestAnimationFrame(callback);
                    };
                    callback();
                }
                else {
                    this.renderer.resetCustomCamera();
                    this.mode = MovementMode.Predefined;
                }
            }
        });
    }
    ;
}

function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
ready(() => {
    const url = new URL(window.location.href);
    const noLights = url.hash === "#nolights";
    const renderer = new Renderer();
    renderer.lightning = !noLights;
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL");
    new FreeMovement(renderer, {
        canvas,
        movementSpeed: 25,
        rotationSpeed: 0.006
    });
    const fullScreenUtils = new FullScreenUtils();
    const toggleFullscreenElement = document.getElementById("toggleFullscreen");
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        }
        else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            }
            else {
                document.body.classList.remove("fs");
            }
        });
    });
    canvas.addEventListener("click", () => renderer.changeScene());
});
//# sourceMappingURL=index.js.map
