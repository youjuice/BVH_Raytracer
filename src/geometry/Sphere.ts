import { Vector3, Vector4 } from 'babylonjs';
import { AABB } from './AABB';
import { Primitive } from './Primitive';

export class Sphere implements Primitive {
    constructor(public center: Vector3, public radius: number) {}

    getAABB(): AABB {
        return new AABB(
            new Vector3(
                this.center.x - this.radius,
                this.center.y - this.radius,
                this.center.z - this.radius
            ),
            new Vector3(
                this.center.x + this.radius,
                this.center.y + this.radius,
                this.center.z + this.radius
            )
        );
    }

    toShaderFormat(): Vector4 {
        return new Vector4(this.center.x, this.center.y, this.center.z, this.radius);
    }
}