import { BaseRenderer, FullModel, UncompressedTextureLoader, DiffuseShader, CombinedAnimation, FrameBuffer, TextureUtils } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
import { DiffuseColoredShader } from "./shaders/DiffuseColoredShader";
import { BendShader } from "./shaders/BendShader";
import { CameraMode } from "./CameraMode";
import { CameraPositionInterpolator } from "./CameraPositionInterpolator";
import { DiffuseAlphaShader } from "./shaders/DiffuseAlphaShader";
import { DiffuseAnimatedTextureShader } from "./shaders/DiffuseAnimatedTextureShader";
import { DiffuseAnimatedTextureChunkedShader } from "./shaders/DiffuseAnimatedTextureChunkedShader";
import { TextureAnimationChunked } from "./TextureAnimationChunked";
import { PointSpriteColoredShader } from "./shaders/PointSpriteColoredShader";
import { AtAnimatedTextureChunkedShader } from "./shaders/AtAnimatedTextureChunkedShader";
import { LitAnimatedTextureChunkedShader } from "./shaders/LitAnimatedTextureChunkedShader";
import { SoftDiffuseColoredShader } from "./shaders/SoftDiffuseColoredShader";
import { SoftDiffuseColoredAlphaShader } from "./shaders/SoftDiffuseColoredAlphaShader";
import { DiffuseAnimatedTextureChunkedColoredShader } from "./shaders/DiffuseAnimatedTextureChunkedColoredShader";
import { SkyShader } from "./shaders/SkyShader";
import { DiffuseOneChannelShader } from "./shaders/DiffuseOneChannelShader";
import { IAnimatedTextureChunkedShader } from "./shaders/IAnimatedTextureChunkedShader";
import { DepthAnimatedTextureChunkedShader } from "./shaders/DepthAnimatedTextureChunkedShader";
import { VertexVignetteShader } from "./shaders/VertexVignetteShader";

const FOV_LANDSCAPE = 60.0; // FOV for landscape
const FOV_PORTRAIT = 80.0; // FOV for portrait
const YAW_COEFF_NORMAL = 200.0; // camera rotation time

export type AnimationType = "idle1" | "idle2" | "fly" | "fly-fast";

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

export class Renderer extends BaseRenderer {
    private lastTime = 0;
    private angleYaw = 0;

    private loaded = false;

    private fmSky = new FullModel();
    private fmStripe = new FullModel();
    private fmDust = new FullModel();

    private fmBody = new FullModel();
    private fmScythe = new FullModel();
    private fmCloth = new FullModel();
    private fmEyes = new FullModel();
    private fmSmoke = new FullModel();
    private fmVignette = new FullModel();

    private textureSky: WebGLTexture | undefined;
    private textureParticle: WebGLTexture | undefined;
    private textureDisplacement: WebGLTexture | undefined;
    private textureDust: WebGLTexture | undefined;
    private textureSmoke: WebGLTexture | undefined;

    private textureBody: WebGLTexture | undefined;
    private textureCloth: WebGLTexture | undefined;
    private textureEyes: WebGLTexture | undefined;
    private textureBodyAnim: WebGLTexture | undefined;
    private textureBodyNormalsAnim: WebGLTexture | undefined;
    private textureScytheAnim: WebGLTexture | undefined;
    private textureScytheNormalsAnim: WebGLTexture | undefined;
    private textureClothAnim: WebGLTexture | undefined;
    private textureEyesAnim: WebGLTexture | undefined;

    private shaderDiffuse: DiffuseShader | undefined;
    private shaderDiffuseOneChannel: DiffuseOneChannelShader | undefined;
    private shaderDiffuseAnimatedTexture: DiffuseAnimatedTextureShader | undefined;
    private shaderDiffuseAnimatedTextureChunked: DiffuseAnimatedTextureChunkedShader | undefined;
    private shaderDiffuseAnimatedTextureChunkedColored: DiffuseAnimatedTextureChunkedColoredShader | undefined;
    private shaderLitAnimatedTextureChunked: LitAnimatedTextureChunkedShader | undefined;
    private shaderAtAnimatedTextureChunked: AtAnimatedTextureChunkedShader | undefined;
    private shaderDiffuseAlpha: DiffuseAlphaShader | undefined;
    private shaderDiffuseColored: DiffuseColoredShader | undefined;
    private shaderBend: BendShader | undefined;
    private shaderPointSpriteColored: PointSpriteColoredShader | undefined;
    private shaderSoftDiffuseColored: SoftDiffuseColoredShader | undefined;
    private shaderSoftDiffuseColoredAlpha: SoftDiffuseColoredAlphaShader | undefined;
    private shaderSky: SkyShader | undefined;
    private shaderDepthAnimated: DepthAnimatedTextureChunkedShader | undefined;
    private shaderVignette: VertexVignetteShader | undefined;

    private textureOffscreenColor: WebGLTexture | undefined
    private textureOffscreenDepth: WebGLTexture | undefined;
    private fboOffscreen: FrameBuffer | undefined;

    private mQuadTriangles: Float32Array | undefined;
    private mTriangleVerticesVignette: WebGLBuffer | undefined;

    private customCamera: mat4 | undefined;

    private Z_NEAR = 1.0;
    private Z_FAR = 110.0;

    private timerDustRotation = 0;
    private DUST_ROTATION_SPEED = 18003333;
    private timerDustFlickering = 0;
    private DUST_FLICKERING_SPEED = 2100;

    private timerCharacterAnimation = 0;
    private REAPER_ANIMATION_PERIOD = 5000;
    private timerSkyAnimation = 0;
    private SKY_ANIMATION_PERIOD = 90000;
    private timerSmokeMovement = 0;
    private SMOKE_MOVEMENT_PERIOD = 8000;
    private timerSmokeRotation = 0;
    private SMOKE_ROTATION_PERIOD = 903333;
    private timerSkyRotation = 0;
    private SKY_ROTATION_PERIOD = 350333;
    private timerGhostsRotation = 0;
    private GHOSTS_ROTATION_PERIOD = 4200;
    private timerGhostsRotation2 = 0;
    private GHOSTS_ROTATION_PERIOD2 = 4100;
    private timerEyes = 0;
    private EYES_PERIOD = 2500;
    private timerLightning = 0;
    private LIGHTNING_PERIOD = 3500;

    private SMOKE_SOFTNESS = 0.01;
    private SMOKE_SCALE = 0.09;
    private SMOKE_TRAVEL_Z = 16.0;

    private readonly ANIMATION_TEXTURE_WIDTH = 1000;
    private readonly REAPER_ANIMATION_TEXTURE_WIDTH = 512;

    private animationsBody: { [key in AnimationType]: TextureAnimationChunked } = {
        "idle1": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 51),
        "idle2": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 51),
        "fly": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 21),
        "fly-fast": new TextureAnimationChunked(this.REAPER_ANIMATION_TEXTURE_WIDTH, 2535, 16)
    };
    private animationsScythe: { [key in AnimationType]: TextureAnimationChunked } = {
        "idle1": new TextureAnimationChunked(608, 608, 51),
        "idle2": new TextureAnimationChunked(608, 608, 51),
        "fly": new TextureAnimationChunked(608, 608, 21),
        "fly-fast": new TextureAnimationChunked(608, 608, 16)
    };
    private animationsEyes: { [key in AnimationType]: TextureAnimationChunked } = {
        "idle1": new TextureAnimationChunked(36, 36, 51),
        "idle2": new TextureAnimationChunked(36, 36, 51),
        "fly": new TextureAnimationChunked(36, 36, 21),
        "fly-fast": new TextureAnimationChunked(36, 36, 16)
    };
    private animationsCloth: { [key in AnimationType]: TextureAnimationChunked } = {
        "idle1": new TextureAnimationChunked(664, 664, 51),
        "idle2": new TextureAnimationChunked(664, 664, 51),
        "fly": new TextureAnimationChunked(664, 664, 21),
        "fly-fast": new TextureAnimationChunked(664, 664, 16)
    };

    private currentAnimation: AnimationType = "idle1";

    private cameraMode = CameraMode.Random;
    private currentRandomCamera = 0;

    protected matViewInverted = mat4.create();
    protected matViewInvertedTransposed = mat4.create();
    protected matTemp = mat4.create();
    protected cameraPosition = vec3.create();
    protected cameraRotation = vec3.create();

    private CAMERAS = [
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
                position: new Float32Array([-13.161895751953125,6.17222785949707,27.73927879333496]),
                rotation: new Float32Array([0.5700000524520874,2.0220019817352295,0])
            },
            end: {
                position: new Float32Array([-17.9815673828125,4.7135090827941895,-0.5088852643966675]),
                rotation: new Float32Array([-0.5280001759529114,1.8480011224746704,0])
            },
            speedMultiplier: 1.0
        },
        {
            start: {
                position: new Float32Array([16.19297218322754,-4.055665493011475,25.375]),
                rotation: new Float32Array([0.5220006108283997,4.746006488800049,0])
            },
            end: {
                position: new Float32Array([13.601936340332031,14.41900634765625,1.7308120727539062]),
                rotation: new Float32Array([-0.47400006651878357,3.803999900817871,0])
            },
            speedMultiplier: 1.0
        },
        {
            start: {
                position: new Float32Array([-8.11626148223877,6.703431129455566,27.8272705078125]),
                rotation: new Float32Array([0.5640001893043518,2.082002878189087,0])
            },
            end: {
                position: new Float32Array([-15.641282081604004,10.945764541625977,9.242594718933105]),
                rotation: new Float32Array([-0.2639997899532318,2.0340025424957275,0])
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

    private readonly CAMERA_SPEED = 0.01;
    private readonly CAMERA_MIN_DURATION = 8000;

    private cameraPositionInterpolator = new CameraPositionInterpolator();

    private readonly SCALE = 10;

    private dustSpriteSize = 0;
    private DUST_COLOR = { r: 10 / 256, g: 10 / 256, b: 10 / 256, a: 1 };
    private DUST_SPRITE_SIZE = 0.006;
    private DUST_SCALE = 0.16;

    private lightningDirection = vec3.create();

    private readonly PRESETS = [
        { // green
            bodySuffix: "green",
            clothSuffix: "green",
            colorEyes: { r: 0.1, g: 0.8, b: 0.1, a: 1 },
            colorSky: { r: 0.38, g:0.60, b:0.4, a: 1 },
            colorSmoke: { r: 0.2, g: 0.5, b: 0.25, a: 0.35 }
        },
        { // crimson
            bodySuffix: "red",
            clothSuffix: "red",
            colorEyes: { r: 0.6, g: 0.1, b: 0.1, a: 1 },
            colorSky: { r: 0.65, g:0.35, b:0.32, a: 1 },
            colorSmoke: { r: 0.17, g: 0.22, b: 0.25, a: 0.8 }
        },
        { // winter
            bodySuffix: "white",
            clothSuffix: "blue",
            colorEyes: { r: 0.13, g: 0.13, b: 0.9, a: 1 },
            colorSky: { r: 0.51, g: 0.72, b: 0.9, a: 1 },
            colorSmoke: { r: 0.8, g: 0.9, b: 0.99, a: 0.25 }
        },
        { // yellow
            bodySuffix: "brown",
            clothSuffix: "yellow",
            colorEyes: { r: 0.7, g: 0.6, b: 0.4, a: 1 }, // brown
            colorSky: { r: 0.95, g: 0.9, b: 0.53, a: 1 }, // yellow
            colorSmoke: { r: 0.6, g: 0.6, b: 0.2, a: 0.3 }
        },
        { // brown
            bodySuffix: "brown",
            clothSuffix: "brown",
            colorEyes: { r: 0.7, g: 0.6, b: 0.4, a: 1 }, // brown
            colorSky: { r: 0.72, g: 0.7, b: 0.43, a: 1 }, // yellow
            colorSmoke: { r: 0.17, g: 0.22, b: 0.25, a: 0.8 }
        }
    ];
    private readonly PRESET = this.PRESETS[4];

    private useLightning = true;

    set lightning(value: boolean) {
        this.useLightning = value;
    }

    constructor() {
        super();
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED;
        this.cameraPositionInterpolator.minDuration = this.CAMERA_MIN_DURATION;
        this.randomizeCamera();

        document.addEventListener("keypress", event => {
            if (event.key === "1") {
                this.CAMERAS[0].start = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                }
                this.logCamera();
            } else if (event.key === "2") {
                this.CAMERAS[0].end = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                }
                this.logCamera();
            }
        });

        this.randomizeLightning();
    }

    private logCamera() {
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

    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3) {
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

    onBeforeInit(): void {
    }

    onAfterInit(): void {
    }

    onInitError(): void {
        document.getElementById("canvasGL")?.classList.add("hidden");
        document.getElementById("alertError")?.classList.remove("hidden");
    }

    initShaders(): void {
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

    async loadFloatingPointTexture(
        url: string,
        gl: WebGL2RenderingContext,
        width: number,
        height: number,
        minFilter: number | undefined = gl.LINEAR,
        magFilter: number | undefined = gl.LINEAR,
        clamp = false,
        type: "fp16" | "snorm8" = "fp16"
    ): Promise<WebGLTexture> {
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
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            type === "fp16" ? gl.RGB16F : gl.RGB8_SNORM,
            width,
            height,
            0,
            gl.RGB,
            type === "fp16" ? gl.HALF_FLOAT : gl.BYTE,
            dataView
        );
        this.checkGlError("loadFloatingPointTexture 1");
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        if (clamp === true) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
        this.checkGlError("loadFloatingPointTexture 2");
        gl.bindTexture(gl.TEXTURE_2D, null);

        console.log(`Loaded texture ${url} [${width}x${height}]`);

        return texture;
    }

    async loadData(): Promise<void> {
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
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/body-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/body-normals.rgb.s8`,
                this.gl as WebGL2RenderingContext,
                this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "snorm8"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/scythe-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/scythe-normals.rgb.s8`,
                this.gl as WebGL2RenderingContext,
                this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "snorm8"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/cloth-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsCloth[this.currentAnimation].textureWidth, this.animationsCloth[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/eyes.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsEyes[this.currentAnimation].textureWidth, this.animationsEyes[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            ),
            UncompressedTextureLoader.load("data/textures/eye_alpha.webp", this.gl),
            UncompressedTextureLoader.load("data/textures/smoke.webp", this.gl)
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
            this.textureSmoke
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

        document.getElementById("message")?.classList.add("hidden");
        document.getElementById("canvasGL")?.classList.remove("transparent");
        setTimeout(() => document.querySelector(".promo")?.classList.remove("transparent"), 1800);
        setTimeout(() => document.querySelector("#toggleFullscreen")?.classList.remove("transparent"), 1800);
    }

    protected initOffscreen() {
        if (this.canvas === undefined) {
            return;
        }

        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false)!;
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height)!;
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");

        console.log("Initialized offscreen FBO.");
    }

    checkGlError(operation: string): void {
        // In production code, override this to do nothing for better performance
    }

    private initVignette() {
        mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);

        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0, // 0. left-bottom
            1.0, -1.0, -5.0, 1.0, 0.0, // 1. right-bottom
            -1.0, 1.0, -5.0, 0.0, 1.0, // 2. left-top
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }

    async changeScene(): Promise<void> {
        if (this.currentAnimation === "idle1") {
            this.currentAnimation = "idle2";
        } else if (this.currentAnimation === "idle2") {
            this.currentAnimation = "fly";
        } else if (this.currentAnimation === "fly") {
            this.currentAnimation = "fly-fast";
        } else if (this.currentAnimation === "fly-fast") {
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
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/body-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "fp16"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/body-normals.rgb.s8`,
                this.gl as WebGL2RenderingContext,
                this.animationsBody[this.currentAnimation].textureWidth, this.animationsBody[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "snorm8"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/scythe-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "fp16"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/scythe-normals.rgb.s8`,
                this.gl as WebGL2RenderingContext,
                this.animationsScythe[this.currentAnimation].textureWidth, this.animationsScythe[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true,
                "snorm8"
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/cloth-positions.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsCloth[this.currentAnimation].textureWidth, this.animationsCloth[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            ),
            this.loadFloatingPointTexture(
                `data/textures/anims/${this.currentAnimation}/eyes.rgb.fp16`,
                this.gl as WebGL2RenderingContext,
                this.animationsEyes[this.currentAnimation].textureWidth, this.animationsEyes[this.currentAnimation].textureHeight,
                this.gl.NEAREST, this.gl.NEAREST,
                true
            )
        ]);
    }

    animate(): void {
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
    setCameraFOV(multiplier: number): void {
        var ratio;

        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        } else {
            ratio = 1.0;
        }

        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        } else {
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
    private positionCamera(a: number) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }

        if (this.cameraMode === CameraMode.Random) {
            this.mVMatrix = this.cameraPositionInterpolator.matrix;
            this.cameraPosition[0] = this.cameraPositionInterpolator.cameraPosition[0];
            this.cameraPosition[1] = this.cameraPositionInterpolator.cameraPosition[1];
            this.cameraPosition[2] = this.cameraPositionInterpolator.cameraPosition[2];
        } else {
            const a = this.angleYaw / 360 * Math.PI * 2;
            const sina = Math.sin(a);
            const cosa = Math.cos(a);
            const cosa2 = Math.cos(a * 2);

            this.cameraPosition[0] = sina * 23;
            this.cameraPosition[1] = cosa * 23;
            this.cameraPosition[2] = 12 + cosa2 * 6;

            mat4.lookAt(this.mVMatrix,
                this.cameraPosition, // eye
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
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen!.width!, this.fboOffscreen!.height!);
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

        this.shaderDiffuse!.use();

        this.setTexture2D(0, this.textureOffscreenDepth!, this.shaderDiffuse!.sTexture!);
        this.drawVignette(this.shaderDiffuse!);
    }

    drawVignetteObject() {
        if (this.shaderVignette === undefined) {
            return;
        }

        this.shaderVignette.use();
        this.gl.uniform4f(this.shaderVignette.color0!, 0.33, 0.33, 0.33, 1);
        this.gl.uniform4f(this.shaderVignette.color1!, 1.0, 1.0, 1.0, 1);

        this.shaderVignette.drawVignette(this, this.fmVignette);
    }

    drawVignette(shader: DiffuseShader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette!);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 20, 4 * 3);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    private drawDepthObjects(): void {
        if (this.shaderDepthAnimated === undefined
            || this.shaderDiffuseAnimatedTexture === undefined
            || this.shaderDiffuseAnimatedTextureChunked === undefined
            || this.shaderAtAnimatedTextureChunked === undefined
            || this.shaderLitAnimatedTextureChunked === undefined
            || this.shaderDiffuseColored === undefined
            || this.shaderBend == undefined
        ) {
            console.log("undefined shaders");
            return;
        }

        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);

        this.shaderDepthAnimated?.use();

        this.drawAnimated(this.shaderDepthAnimated, this.timerCharacterAnimation, this.animationsBody[this.currentAnimation], this.fmBody, this.textureBodyAnim!, this.REAPER_ANIMATION_TEXTURE_WIDTH, "animateStartToEnd");
        this.drawAnimated(this.shaderDepthAnimated, this.timerCharacterAnimation, this.animationsScythe[this.currentAnimation], this.fmScythe, this.textureScytheAnim!, 608, "animateStartToEnd");

        this.gl.disable(this.gl.CULL_FACE);
        this.shaderAtAnimatedTextureChunked.use();
        this.setTexture2D(1, this.textureCloth!, this.shaderAtAnimatedTextureChunked.sTexture!);
        this.drawAnimated(this.shaderAtAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsCloth[this.currentAnimation], this.fmCloth, this.textureClothAnim!, 664, "animateStartToEnd");
        this.gl.enable(this.gl.CULL_FACE);
    }

    private drawSceneObjects(): void {
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
            || this.shaderBend == undefined
        ) {
            console.log("undefined shaders");
            return;
        }

        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);

        const light = this.getLightningIntensity();

        this.gl.disable(this.gl.CULL_FACE);
        this.shaderAtAnimatedTextureChunked.use();
        this.setTexture2D(1, this.textureCloth!, this.shaderAtAnimatedTextureChunked.sTexture!);
        this.drawAnimated(this.shaderAtAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsCloth[this.currentAnimation], this.fmCloth, this.textureClothAnim!, 664, "animateStartToEnd");
        this.gl.enable(this.gl.CULL_FACE);

        this.shaderLitAnimatedTextureChunked.use();
        if (light > 0) {
            this.gl.uniform4f(
                this.shaderLitAnimatedTextureChunked.uLightDir!,
                this.lightningDirection[0],
                this.lightningDirection[1],
                this.lightningDirection[2],
                0.0
            );
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightColor!, 1.0, 1.0, 1.0, 0.0);
            this.gl.uniform1f(this.shaderLitAnimatedTextureChunked.uLightIntensity!, light);
        } else {
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightDir!, 0, 0, -1, 0);
            this.gl.uniform4f(this.shaderLitAnimatedTextureChunked.uLightColor!, -1.0, -1.0, -1.0, 0.0);
            this.gl.uniform1f(this.shaderLitAnimatedTextureChunked.uLightIntensity!, 0.7);
        }

        this.setTexture2D(1, this.textureBody!, this.shaderLitAnimatedTextureChunked.sTexture!);
        this.setTexture2D(2, this.textureBodyNormalsAnim!, this.shaderLitAnimatedTextureChunked.sNormals!);
        this.drawAnimated(this.shaderLitAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsBody[this.currentAnimation], this.fmBody, this.textureBodyAnim!, this.REAPER_ANIMATION_TEXTURE_WIDTH, "animateStartToEnd");

        this.setTexture2D(2, this.textureScytheNormalsAnim!, this.shaderLitAnimatedTextureChunked.sNormals!);
        this.drawAnimated(this.shaderLitAnimatedTextureChunked, this.timerCharacterAnimation, this.animationsScythe[this.currentAnimation], this.fmScythe, this.textureScytheAnim!, 608, "animateStartToEnd");

        this.gl.depthMask(false);
        this.shaderDiffuseAnimatedTextureChunkedColored.use();
        const eyesOpacity = this.getEyesOpacity();
        this.gl.uniform4f(
            this.shaderDiffuseAnimatedTextureChunkedColored.uColor!,
            this.PRESET.colorEyes.r * eyesOpacity,
            this.PRESET.colorEyes.g * eyesOpacity,
            this.PRESET.colorEyes.b * eyesOpacity,
            this.PRESET.colorEyes.a * eyesOpacity,
        );
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.setTexture2D(1, this.textureEyes!, this.shaderDiffuseAnimatedTextureChunkedColored.sTexture!);
        this.drawAnimated(this.shaderDiffuseAnimatedTextureChunkedColored, this.timerCharacterAnimation, this.animationsEyes[this.currentAnimation], this.fmEyes, this.textureEyesAnim!, 36, "animateStartToEnd");
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);

        this.gl.enable(this.gl.CULL_FACE);

        // Sky is a distant object drawn one of the last, it doesn't add useful depth information.
        // Reduce memory bandwidth by disabling writing to z-buffer.
        this.gl.depthMask(false);

        this.shaderSky.use();
        this.setTexture2D(0, this.textureSky!, this.shaderSky.sTexture!);
        this.setTexture2D(1, this.textureDisplacement!, this.shaderSky.sDisplacement!);
        this.shaderSky.setColor(this.PRESET.colorSky.r, this.PRESET.colorSky.g, this.PRESET.colorSky.b, this.PRESET.colorSky.a);
        this.gl.uniform1f(this.shaderSky.uTime!, this.timerSkyAnimation);
        this.gl.uniform1f(this.shaderSky.uLightning!, light * 5);
        this.gl.uniform4f(this.shaderSky.uLightningExponent!, 3.3, 3.3, 3.3, 3.3);
        this.shaderSky.drawModel(
            this, this.fmSky,
            this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2],
            0, 0, this.timerSkyRotation * Math.PI * 2,
            1, 1, 1
        );

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

    private drawParticles(): void {
        if (this.shaderSoftDiffuseColored === undefined || this.shaderSoftDiffuseColoredAlpha === undefined) {
            console.log("undefined shaders");
            return;
        }

        this.shaderSoftDiffuseColoredAlpha.use();
        this.initDepthReadShader(this.shaderSoftDiffuseColoredAlpha);
        this.setTexture2D(0, this.textureSmoke!, this.shaderSoftDiffuseColoredAlpha.sTexture!);

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

            this.gl.uniform4f(
                this.shaderSoftDiffuseColoredAlpha.color!,
                this.PRESET.colorSmoke.r, this.PRESET.colorSmoke.g, this.PRESET.colorSmoke.b, this.PRESET.colorSmoke.a * opacity
            );

            this.drawDiffuseVBOFacingCamera(
                this.shaderSoftDiffuseColoredAlpha!,
                this.fmSmoke,
                x, y, z,
                scale, 1, 1,
                rotation
            );
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

            this.gl.uniform4f(
                this.shaderSoftDiffuseColoredAlpha.color!,
                this.PRESET.colorSmoke.r, this.PRESET.colorSmoke.g, this.PRESET.colorSmoke.b, this.PRESET.colorSmoke.a * opacity
            );

            this.drawDiffuseVBOFacingCamera(
                this.shaderSoftDiffuseColoredAlpha!,
                this.fmSmoke,
                x, y, z,
                scale, 1, 1,
                rotation
            );
        }
    }

    private drawGhosts(): void {
        if (this.shaderBend === undefined) {
            return;
        }

        this.gl.disable(this.gl.CULL_FACE);
        this.gl.depthMask(false);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.shaderBend.use();
        this.shaderBend.setColor(0, 0, 0, 1);
        this.setTexture2D(0, this.textureParticle!, this.shaderBend.sTexture!);

        this.shaderBend.setColor(0.05, 0.05, 0.05, 0.35);

        this.shaderBend.setRadius(9 + 3 * (1 + Math.sin((this.timerGhostsRotation2) * Math.PI * 2)));
        this.shaderBend.setLength(0.3);
        this.shaderBend.drawModel(this, this.fmStripe,
            0, 0, 12 + 0.4 * Math.sin(this.timerGhostsRotation * Math.PI * 4),
            0.2, 0.3, (1.5 - this.timerGhostsRotation) * Math.PI * 2,
            1.0, 1.0, 0.18 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2))
        );
        this.shaderBend.setRadius(9.5 + 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.3) * Math.PI * 2)));
        this.shaderBend.drawModel(this, this.fmStripe,
            0, 0, 10 - 0.4 * Math.sin((this.timerGhostsRotation + 0.3) * Math.PI * 4),
            -0.1, 0.3, (0.73 - this.timerGhostsRotation) * Math.PI * 2,
            1.0, 1.0, 0.2 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2))
        );

        this.shaderBend.setRadius(10 - 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.55) * Math.PI * 2)));
        this.shaderBend.setLength(-0.3);
        this.shaderBend.drawModel(this, this.fmStripe,
            0, 0, 15 + 0.3 * Math.sin((this.timerGhostsRotation + 0.6) * Math.PI * 4),
            -0.2, -0.3, (this.timerGhostsRotation) * Math.PI * 2,
            1.0, 1.0, 0.2 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2))
        );
        this.shaderBend.setRadius(8 + 3 * (1 + Math.sin((this.timerGhostsRotation2 + 0.83) * Math.PI * 2)));
        this.shaderBend.drawModel(this, this.fmStripe,
            0, 0, 7 - 0.3 * Math.sin((this.timerGhostsRotation + 0.8) * Math.PI * 4),
            0.1, -0.3, (1.3 + this.timerGhostsRotation) * Math.PI * 2,
            1.0, 1.0, 0.15 + 0.06 * (Math.sin((this.timerGhostsRotation2) * Math.PI * 2))
        );

        this.gl.enable(this.gl.CULL_FACE);
    }

    private drawDust(lightIntensity: number): void {
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
        this.setTexture2D(0, this.textureDust!, this.shaderPointSpriteColored.tex0!);
        this.gl.uniform1f(this.shaderPointSpriteColored.uThickness!, this.dustSpriteSize);

        const colorR = this.DUST_COLOR.r * lightIntensity;
        const colorG = this.DUST_COLOR.g * lightIntensity;
        const colorB = this.DUST_COLOR.b * lightIntensity;

        this.gl.uniform4f(
            this.shaderPointSpriteColored.color!,
            this.DUST_COLOR.r * flickering1 + colorR,
            this.DUST_COLOR.g * flickering1 + colorG,
            this.DUST_COLOR.b * flickering1 + colorB,
            this.DUST_COLOR.a
        );
        this.drawPointSpritesVBOTranslatedRotatedScaled(
            this.shaderPointSpriteColored,
            this.fmDust,
            0, 2, 11,
            a, b, a,
            this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE
        );

        this.gl.uniform4f(
            this.shaderPointSpriteColored.color!,
            this.DUST_COLOR.r * flickering2 + colorR,
            this.DUST_COLOR.g * flickering2 + colorG,
            this.DUST_COLOR.b * flickering2 + colorB,
            this.DUST_COLOR.a
        );
        this.drawPointSpritesVBOTranslatedRotatedScaled(
            this.shaderPointSpriteColored,
            this.fmDust,
            1, -2, 12,
            b, -a, b,
            this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE
        );

        this.gl.uniform4f(
            this.shaderPointSpriteColored.color!,
            this.DUST_COLOR.r * flickering3 + colorR,
            this.DUST_COLOR.g * flickering3 + colorG,
            this.DUST_COLOR.b * flickering3 + colorB,
            this.DUST_COLOR.a
        );
        this.drawPointSpritesVBOTranslatedRotatedScaled(
            this.shaderPointSpriteColored,
            this.fmDust,
            3, -1, 13,
            -b, -a, -b,
            this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE
        );

        this.gl.uniform4f(
            this.shaderPointSpriteColored.color!,
            this.DUST_COLOR.r * flickering4 + colorR,
            this.DUST_COLOR.g * flickering4 + colorG,
            this.DUST_COLOR.b * flickering4 + colorB,
            this.DUST_COLOR.a
        );
        this.drawPointSpritesVBOTranslatedRotatedScaled(
            this.shaderPointSpriteColored,
            this.fmDust,
            2, -2, 14,
            -a, -a, b,
            this.DUST_SCALE, this.DUST_SCALE, this.DUST_SCALE
        );
    }

    private drawAnimated(
        shader: IAnimatedTextureChunkedShader,
        timer: number,
        animation: TextureAnimationChunked,
        model: FullModel,
        textureAnimation: WebGLTexture,
        animationTextureWidth = this.ANIMATION_TEXTURE_WIDTH,
        animationType: ("animateStartEndStart" | "animateStartToEnd") = "animateStartEndStart"
    ) {
        this.gl.uniform1i(shader.uTextureWidthInt!, animationTextureWidth);
        this.setTexture2D(0, textureAnimation, shader.sPositions!);
        this.gl.uniform4f(
            shader.uTexelSizes!,
            animation.textureWidth,
            animation.texelHalfWidth,
            animation[animationType](timer),
            animation.chunkSize
        );
        this.gl.uniform1f(shader.uTexelHeight!, 1.0 / animation.textureHeight);
        shader.drawModel(
            this, model,
            0, 0, 0,
            0, 0, 0,
            this.SCALE, this.SCALE, this.SCALE
        );
    }

    private clamp(i: number, low: number, high: number): number {
        return Math.max(Math.min(i, high), low);
    }

    private randomizeCamera(): void {
        this.currentRandomCamera = (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (this.CAMERAS.length - 2))) % this.CAMERAS.length;

        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED * this.CAMERAS[this.currentRandomCamera].speedMultiplier;
        this.cameraPositionInterpolator.position = this.CAMERAS[this.currentRandomCamera];
        this.cameraPositionInterpolator.reset();
    }

    private randomizeLightning(): void {
        vec3.random(this.lightningDirection, 1);
    }

    private drawPointSpritesVBOTranslatedRotatedScaled(shader: PointSpriteColoredShader, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
        model.bindBuffers(this.gl);

        this.gl.enableVertexAttribArray(shader.aPosition!);
        this.gl.vertexAttribPointer(shader.aPosition!, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);

        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);

        this.gl.uniformMatrix4fv(shader.uMvp!, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.POINTS, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
    }

    private drawDiffuseVBOFacingCamera(shader: DiffuseShader, model: FullModel, tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        model.bindBuffers(this.gl);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);

        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.mMVPMatrix);
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }

    private calculateMVPMatrixForSprite(tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        mat4.identity(this.mMMatrix);
        mat4.translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        mat4.scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        mat4.multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        mat4.rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        mat4.multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }

    private resetMatrixRotations(matrix: mat4) {
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

    private initDepthReadShader(shader: SoftDiffuseColoredShader) {
        this.gl.uniform2f(shader.cameraRange!, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize!, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize!, this.SMOKE_SOFTNESS);
        this.setTexture2D(2, this.textureOffscreenDepth!, shader.sDepth!);
    }

    private smootherstep(edge0: number, edge1: number, x: number): number {
        x = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return x * x * x * (x * (x * 6 - 15) + 10);
    }

    private getEyesOpacity(): number {
        const x = this.timerEyes * Math.PI * 2;
        return 0.125 + (Math.sin(x) + 1) * 0.5;
    }

    private getLightningIntensity(): number {
        const x = this.timerLightning * Math.PI * 2;
        const wave = Math.sin(x * 0.2) - Math.cos(x * 2.34) + Math.sin(x * 15.13) + Math.cos(x * 23.55) - 2.0;
        return wave > 0 ? wave : 0;
    }
}
