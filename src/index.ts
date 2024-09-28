import { Engine, Scene, FreeCamera, Vector3, Color4, Viewport, Mesh, VertexBuffer } from 'babylonjs';
import { Raytracer } from './raytracer/Raytracer';
import { PerformanceMeasurement } from './utils/PerformanceMeasurement';
import { buildBVH } from './bvh/BVHBuilder';
import { Sphere } from './geometry/Sphere';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    }, true);
    const scene = new Scene(engine);

    // 카메라 설정
    const camera = new FreeCamera('camera1', new Vector3(0, 0, -5), scene);
    camera.setTarget(Vector3.Zero());
    camera.fov = Math.PI / 4;
    camera.minZ = 0.1;
    camera.maxZ = 100;
    scene.clearColor = new Color4(0.0, 0.0, 0.2, 1.0);
    camera.viewport = new Viewport(0, 0, 1, 1);

    // 구체 생성
    const spheres: Sphere[] = [
        new Sphere(new Vector3(0, 0, 0), 1),
        new Sphere(new Vector3(-3, 0, 2), 0.5),
        new Sphere(new Vector3(2, 0, 2), 0.5),
        new Sphere(new Vector3(0, 1, -2), 0.7),
        new Sphere(new Vector3(-1, -1, -1), 0.3),
        new Sphere(new Vector3(1, 1, 1), 0.4),
    ];

    // BVH 구축
    const bvh = buildBVH(spheres);

    // Raytracer 초기화 (BVH 전달)
    const raytracer = new Raytracer(scene, camera, bvh, spheres);

    // 성능 측정
    const performanceMeasurement = new PerformanceMeasurement(scene, 10000);

    // 렌더 루프
    engine.runRenderLoop(() => {
        raytracer.update();
        scene.render();

        if (performanceMeasurement.recordFrame()) {
            console.log(performanceMeasurement.getResults());
            performanceMeasurement.dispose();
            engine.stopRenderLoop();
        }
    });

    // 리사이즈 이벤트 처리
    window.addEventListener('resize', () => {
        engine.resize();
    });
});