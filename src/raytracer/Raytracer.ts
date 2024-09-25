import { Engine, Scene, FreeCamera, Vector2, Vector3, Vector4, ShaderMaterial, Effect, Mesh, RawTexture } from 'babylonjs';
import raytraceFragmentShader from './shaders/raytracer.fragment.glsl';
import raytraceVertexShader from './shaders/raytracer.vertex.glsl';
import { BVHNode } from '../bvh/BVHNode';
import { flattenBVH } from '../bvh/BVHFlattener';
import { Sphere } from "../geometry/Sphere";

export class Raytracer {
    private rayTraceMaterial: ShaderMaterial;
    private plane: Mesh;
    private spheresData: Vector4[];
    private lightPosition: Vector3;
    private flattenedBVH: number[];
    private bvhTexture: RawTexture;

    constructor(private scene: Scene, private camera: FreeCamera, private bvh: BVHNode, private spheres: Sphere[]) {
        this.initShaders();
        this.initSpheresData();
        this.initBVH();
        this.initBVHTexture();
        this.initMaterial();
        this.initPlane();
        this.lightPosition = new Vector3(5, 5, -5);
    }

    private initShaders() {
        Effect.ShadersStore["raytraceVertexShader"] = raytraceVertexShader;
        Effect.ShadersStore["raytraceFragmentShader"] = raytraceFragmentShader;
    }

    private initSpheresData() {
        this.spheresData = this.spheres.map(sphere => sphere.toShaderFormat());
    }

    private initBVH() {
        this.flattenedBVH = flattenBVH(this.bvh);
        console.log("Flattened BVH:", Array.from(this.flattenedBVH.slice(0, 24))); // 처음 3개 노드만 출력
    }

    private initBVHTexture() {
        const textureSize = Math.ceil(Math.sqrt(this.flattenedBVH.length / 4));
        const paddedData = new Float32Array(textureSize * textureSize * 4);
        paddedData.set(this.flattenedBVH);

        this.bvhTexture = RawTexture.CreateRGBATexture(
            paddedData,
            textureSize,
            textureSize,
            this.scene,
            false,
            false,
            Engine.TEXTURE_NEAREST_SAMPLINGMODE,
            Engine.TEXTURETYPE_FLOAT
        );
    }

    private initMaterial() {
        this.rayTraceMaterial = new ShaderMaterial("rayTrace", this.scene, {
            vertex: "raytrace",
            fragment: "raytrace",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "cameraPosition", "cameraDirection", "cameraUp", "cameraRight", "aspectRatio", "fov", "spheres", "lightPosition", "resolution", "bvhTextureSize"],
            samplers: ["bvhTexture"],
            defines: [
                "#define SPHERE_COUNT " + this.spheres.length,
                "#define USE_BVH_TEXTURE"
            ]
        });

        this.rayTraceMaterial.setTexture("bvhTexture", this.bvhTexture);
        this.rayTraceMaterial.setFloat("bvhTextureSize", this.bvhTexture.getSize().width);
    }

    private initPlane() {
        this.plane = Mesh.CreatePlane("plane", 4, this.scene);
        this.plane.material = this.rayTraceMaterial;
    }

    public update() {
        const aspect = this.scene.getEngine().getAspectRatio(this.camera);
        const spheresArray = this.spheresData.reduce((acc, sphere) => {
            acc.push(sphere.x, sphere.y, sphere.z, sphere.w);
            return acc;
        }, [] as number[]);

        this.rayTraceMaterial.setVector3("cameraPosition", this.camera.position);
        this.rayTraceMaterial.setVector3("cameraDirection", this.camera.getForwardRay().direction);
        this.rayTraceMaterial.setVector3("cameraUp", this.camera.upVector);
        this.rayTraceMaterial.setVector3("cameraRight", Vector3.Cross(this.camera.getForwardRay().direction, this.camera.upVector));
        this.rayTraceMaterial.setFloat("aspectRatio", aspect);
        this.rayTraceMaterial.setFloat("fov", this.camera.fov);
        this.rayTraceMaterial.setArray4("spheres", spheresArray);
        this.rayTraceMaterial.setVector3("lightPosition", this.lightPosition);
        this.rayTraceMaterial.setVector2("resolution", new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight()));
    }
}