import { Engine, Scene, FreeCamera, Vector3, Color4, Viewport } from 'babylonjs';
import { Raytracer } from './raytracer/Raytracer';
import { PerformanceMeasurement } from './PerformanceMeasurement';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const engine = new Engine(canvas);
    const scene = new Scene(engine);

    // 카메라 설정
    const camera = new FreeCamera('camera1', new Vector3(0, 0, -5), scene);
    camera.setTarget(Vector3.Zero());
    camera.fov = Math.PI / 4;
    camera.minZ = 0.1;
    camera.maxZ = 100;
    scene.clearColor = new Color4(0.0, 0.0, 0.2, 1.0);
    camera.viewport = new Viewport(0, 0, 1, 1);

    // Raytracer 초기화
    const raytracer = new Raytracer(scene, camera);

    // 성능 측정
    const performanceMeasurement = new PerformanceMeasurement(10000);

    // 렌더 루프
    engine.runRenderLoop(() => {
        const frameStart = performance.now();

        raytracer.update();
        scene.render();

        const frameTime = performance.now() - frameStart;

        if (performanceMeasurement.recordFrame(frameTime)) {
            console.log(performanceMeasurement.getResults());
            engine.stopRenderLoop();
        }
    });

    // 리사이즈 이벤트 처리
    window.addEventListener('resize', () => {
        engine.resize();
    });
});