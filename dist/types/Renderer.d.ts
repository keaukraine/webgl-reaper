import { BaseRenderer, DiffuseShader } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
export declare type AnimationType = "idle1" | "idle2" | "fly" | "fly-fast";
export declare class Renderer extends BaseRenderer {
    private lastTime;
    private angleYaw;
    private loaded;
    private fmSky;
    private fmStripe;
    private fmDust;
    private fmBody;
    private fmScythe;
    private fmCloth;
    private fmEyes;
    private fmSmoke;
    private textureSky;
    private textureParticle;
    private textureDisplacement;
    private textureDust;
    private textureSmoke;
    private textureBody;
    private textureCloth;
    private textureEyes;
    private textureBodyAnim;
    private textureBodyNormalsAnim;
    private textureScytheAnim;
    private textureScytheNormalsAnim;
    private textureClothAnim;
    private textureEyesAnim;
    private textureVignette;
    private shaderDiffuse;
    private shaderDiffuseOneChannel;
    private shaderDiffuseAnimatedTexture;
    private shaderDiffuseAnimatedTextureChunked;
    private shaderDiffuseAnimatedTextureChunkedColored;
    private shaderLitAnimatedTextureChunked;
    private shaderAtAnimatedTextureChunked;
    private shaderDiffuseAlpha;
    private shaderDiffuseColored;
    private shaderBend;
    private shaderPointSpriteColored;
    private shaderSoftDiffuseColored;
    private shaderSoftDiffuseColoredAlpha;
    private shaderSky;
    private shaderDepthAnimated;
    private textureOffscreenColor;
    private textureOffscreenDepth;
    private fboOffscreen;
    private mQuadTriangles;
    private mTriangleVerticesVignette;
    private customCamera;
    private Z_NEAR;
    private Z_FAR;
    private timerDustRotation;
    private DUST_ROTATION_SPEED;
    private timerDustFlickering;
    private DUST_FLICKERING_SPEED;
    private timerCharacterAnimation;
    private REAPER_ANIMATION_PERIOD;
    private timerSkyAnimation;
    private SKY_ANIMATION_PERIOD;
    private timerSmokeMovement;
    private SMOKE_MOVEMENT_PERIOD;
    private timerSmokeRotation;
    private SMOKE_ROTATION_PERIOD;
    private timerSkyRotation;
    private SKY_ROTATION_PERIOD;
    private timerGhostsRotation;
    private GHOSTS_ROTATION_PERIOD;
    private timerGhostsRotation2;
    private GHOSTS_ROTATION_PERIOD2;
    private timerEyes;
    private EYES_PERIOD;
    private timerLightning;
    private LIGHTNING_PERIOD;
    private SMOKE_SOFTNESS;
    private SMOKE_SCALE;
    private SMOKE_TRAVEL_Z;
    private readonly ANIMATION_TEXTURE_WIDTH;
    private readonly REAPER_ANIMATION_TEXTURE_WIDTH;
    private animationsBody;
    private animationsScythe;
    private animationsEyes;
    private animationsCloth;
    private currentAnimation;
    private cameraMode;
    private currentRandomCamera;
    protected matViewInverted: mat4;
    protected matViewInvertedTransposed: mat4;
    protected matTemp: mat4;
    protected cameraPosition: vec3;
    protected cameraRotation: vec3;
    private CAMERAS;
    private readonly CAMERA_SPEED;
    private readonly CAMERA_MIN_DURATION;
    private cameraPositionInterpolator;
    private readonly SCALE;
    private dustSpriteSize;
    private DUST_COLOR;
    private DUST_SPRITE_SIZE;
    private DUST_SCALE;
    private lightningDirection;
    private readonly PRESETS;
    private readonly PRESET;
    private useLightning;
    set lightning(value: boolean);
    constructor();
    private logCamera;
    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3): void;
    resetCustomCamera(): void;
    onBeforeInit(): void;
    onAfterInit(): void;
    onInitError(): void;
    initShaders(): void;
    loadFloatingPointTexture(url: string, gl: WebGL2RenderingContext, width: number, height: number, minFilter?: number, magFilter?: number, clamp?: boolean, type?: "fp16" | "snorm8"): Promise<WebGLTexture>;
    loadData(): Promise<void>;
    protected initOffscreen(): void;
    checkGlError(operation: string): void;
    private initVignette;
    changeScene(): Promise<void>;
    animate(): void;
    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void;
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera;
    /** Issues actual draw calls */
    drawScene(): void;
    drawTestDepth(): void;
    drawSceneVignette(): void;
    drawVignette(shader: DiffuseShader): void;
    private drawDepthObjects;
    private drawSceneObjects;
    private drawParticles;
    private drawGhosts;
    private drawDust;
    private drawAnimated;
    private clamp;
    private randomizeCamera;
    private randomizeLightning;
    private drawPointSpritesVBOTranslatedRotatedScaled;
    private drawDiffuseVBOFacingCamera;
    private calculateMVPMatrixForSprite;
    private resetMatrixRotations;
    private initDepthReadShader;
    private smootherstep;
    private getEyesOpacity;
    private getLightningIntensity;
}