import { Scene, FreeCamera, Vector2, Vector3, Vector4, ShaderMaterial, Effect, Mesh } from 'babylonjs';
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
    private bvhInitialized: boolean = false;

    constructor(private scene: Scene, private camera: FreeCamera, private bvh: BVHNode, private spheres: Sphere[]) {
        this.initShaders();
        this.initSpheresData();
        this.initBVH();
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

    private initMaterial() {
        this.rayTraceMaterial = new ShaderMaterial("rayTrace", this.scene, {
            vertex: "raytrace",
            fragment: "raytrace",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "cameraPosition", "cameraDirection", "cameraUp", "cameraRight", "aspectRatio", "fov", "spheres", "lightPosition", "resolution", "bvhNodes"],
            defines: [
                "#define SPHERE_COUNT " + this.spheres.length,
                "#define MAX_BVH_NODES " + this.flattenedBVH.length / 8
            ]
        });
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

        // BVH 데이터를 한 번만 설정
        if (!this.bvhInitialized) {
            this.rayTraceMaterial.setFloats("bvhNodes", this.flattenedBVH);
            this.bvhInitialized = true;
        }

        this.rayTraceMaterial.setVector3("cameraPosition", this.camera.position);
        this.rayTraceMaterial.setVector3("cameraDirection", this.camera.getForwardRay().direction);
        this.rayTraceMaterial.setVector3("cameraUp", this.camera.upVector);
        this.rayTraceMaterial.setVector3("cameraRight", Vector3.Cross(this.camera.getForwardRay().direction, this.camera.upVector));
        this.rayTraceMaterial.setFloat("aspectRatio", aspect);
        this.rayTraceMaterial.setFloat("fov", this.camera.fov);
        this.rayTraceMaterial.setArray4("spheres", spheresArray);
        this.rayTraceMaterial.setVector3("lightPosition", this.lightPosition);
        this.rayTraceMaterial.setVector2("resolution", new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight()));

        // console.log("Spheres data:", spheresArray);
        // console.log("Camera position:", this.camera.position);
        // console.log("Camera direction:", this.camera.getForwardRay().direction);
        // console.log("Light position:", this.lightPosition);
    }
}