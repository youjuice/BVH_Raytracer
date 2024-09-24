import { Vector3 } from "babylonjs";

export class AABB {
    min: Vector3;
    max: Vector3;

    constructor(min: Vector3, max: Vector3) {
        this.min = min;
        this.max = max;
    }

    static fromPoints(points: Vector3[]): AABB {
        let min = points[0].clone();
        let max = points[0].clone();

        for (let i = 1; i < points.length; i++) {
            min = Vector3.Minimize(min, points[i]);
            max = Vector3.Maximize(max, points[i]);
        }

        return new AABB(min, max);
    }

    getCenter(): Vector3 {
        return Vector3.Center(this.min, this.max);
    }

    getLongestAxis(): number {
        const extent = this.max.subtract(this.min);
        return extent.x > extent.y
            ? (extent.x > extent.z ? 0 : 2)
            : (extent.y > extent.z ? 1 : 2);
    }
}