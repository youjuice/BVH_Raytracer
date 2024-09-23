import { Scene, FreeCamera, Vector2, Vector3, Vector4, ShaderMaterial, Effect, Mesh } from 'babylonjs';
import raytraceFragmentShader from './shaders/raytracer.fragment.glsl';
import raytraceVertexShader from './shaders/raytracer.vertex.glsl';

export class Raytracer {
    private rayTraceMaterial: ShaderMaterial;
    private plane: Mesh;
    private spheres: Vector4[];
    private lightPosition: Vector3;

    constructor(private scene: Scene, private camera: FreeCamera) {
        this.initShaders();
        this.initSpheres();
        this.initMaterial();
        this.initPlane();
        this.lightPosition = new Vector3(5, 5, -5);
    }

    private initShaders() {
        Effect.ShadersStore["raytraceFragmentShader"] = raytraceFragmentShader;
        Effect.ShadersStore["raytraceVertexShader"] = raytraceVertexShader;
    }

    private initSpheres() {
        this.spheres = [
            new Vector4(0, 0, 0, 1),
            new Vector4(-2, 0, 2, 0.5),
            new Vector4(2, 0, 2, 0.5),
        ];
    }

    private initMaterial() {
        this.rayTraceMaterial = new ShaderMaterial("rayTrace", this.scene, {
            vertex: "raytrace",
            fragment: "raytrace",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "cameraPosition", "cameraDirection", "cameraUp", "cameraRight", "aspectRatio", "fov", "spheres", "lightPosition", "resolution"],
            defines: [
                "#define SPHERE_COUNT " + this.spheres.length
            ]
        });
    }

    private initPlane() {
        this.plane = Mesh.CreatePlane("plane", 4, this.scene);
        this.plane.material = this.rayTraceMaterial;
    }

    public update() {
        const aspect = this.scene.getEngine().getAspectRatio(this.camera);
        const spheresArray = this.spheres.reduce((acc, sphere) => {
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