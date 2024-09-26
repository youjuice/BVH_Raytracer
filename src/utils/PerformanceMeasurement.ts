import { Scene, SceneInstrumentation } from 'babylonjs';

export class PerformanceMeasurement {
    private sceneInstrumentation: SceneInstrumentation;
    private startTime: number;
    private measurementDuration: number;
    private frameCount: number = 0;

    constructor(private scene: Scene, duration: number = 10000) {
        this.measurementDuration = duration;
        this.startTime = performance.now();

        this.sceneInstrumentation = new SceneInstrumentation(scene);
        this.sceneInstrumentation.captureFrameTime = true;
        this.sceneInstrumentation.captureRenderTime = true;
        this.sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
    }

    recordFrame(): boolean {
        this.frameCount++;
        return performance.now() - this.startTime > this.measurementDuration;
    }

    getResults(): string {
        const totalTime = (performance.now() - this.startTime) / 1000; // 초 단위
        const avgFps = this.frameCount / totalTime;

        return `Performance Test Results (${this.measurementDuration / 1000} seconds):
                Frames: ${this.frameCount}
                Average FPS: ${avgFps.toFixed(2)}
                Average Frame Time: ${this.sceneInstrumentation.frameTimeCounter.average.toFixed(2)} ms
                Average Render Time: ${this.sceneInstrumentation.renderTimeCounter.average.toFixed(2)} ms
                Average Active Meshes Evaluation Time: ${this.sceneInstrumentation.activeMeshesEvaluationTimeCounter.average.toFixed(2)} ms
                Draw Calls: ${this.scene.getEngine()._drawCalls.current}`;
    }

    dispose() {
        this.sceneInstrumentation.dispose();
    }
}