import { Vector3 } from "babylonjs";

export class AABB {
    min: Vector3;
    max: Vector3;

    constructor(min: Vector3, max: Vector3) {
        this.min = min;
        this.max = max;
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