import { AABB } from '../geometry/AABB';

export class BVHNode {
    aabb: AABB;
    left: BVHNode | null;
    right: BVHNode | null;
    primitiveIndices: number[];

    constructor(aabb: AABB) {
        this.aabb = aabb;
        this.left = null;
        this.right = null;
        this.primitiveIndices = [];
    }

    isLeaf(): boolean {
        return this.left === null && this.right === null;
    }
}