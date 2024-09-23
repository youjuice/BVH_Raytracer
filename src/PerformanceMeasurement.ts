export interface PerformanceStats {
    count: number;
    sum: number;
    min: number;
    max: number;
    values: number[];
}

export class PerformanceMeasurement {
    private stats: PerformanceStats;
    private startTime: number;
    private measurementDuration: number;

    constructor(duration: number = 10000) {
        this.stats = {
            count: 0,
            sum: 0,
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE,
            values: []
        };
        this.startTime = performance.now();
        this.measurementDuration = duration;
    }

    recordFrame(frameTime: number): boolean {
        this.stats.count++;
        this.stats.sum += frameTime;
        this.stats.min = Math.min(this.stats.min, frameTime);
        this.stats.max = Math.max(this.stats.max, frameTime);
        this.stats.values.push(frameTime);

        return performance.now() - this.startTime > this.measurementDuration;
    }

    getResults(): string {
        const average = this.stats.sum / this.stats.count;
        this.stats.values.sort((a, b) => a - b);
        const median = this.stats.values[Math.floor(this.stats.values.length / 2)];

        const variance = this.stats.values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / this.stats.count;
        const stdDev = Math.sqrt(variance);

        return `Performance Test Results (${this.measurementDuration / 1000} seconds):
                Frames: ${this.stats.count}
                Average: ${average.toFixed(4)} ms
                Median: ${median.toFixed(4)} ms
                Min: ${this.stats.min.toFixed(4)} ms
                Max: ${this.stats.max.toFixed(4)} ms
                Std Dev: ${stdDev.toFixed(4)} ms`;
    }
}