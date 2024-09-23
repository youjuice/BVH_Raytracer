import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder } from 'babylonjs';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const engine = new Engine(canvas);
    const scene = new Scene(engine);

    const camera = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);

    new HemisphericLight('light1', new Vector3(0, 1, 0), scene);

    MeshBuilder.CreateBox('box', {size: 2}, scene);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener('resize', () => {
        engine.resize();
    });
});