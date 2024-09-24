import { BVHNode } from './BVHNode';
import { AABB } from '../geometry/AABB';
import { Vector3 } from "babylonjs";

interface Primitive {
    getAABB(): AABB;
}

export function buildBVH(primitives: Primitive[], maxPrimitivesPerLeaf: number = 4): BVHNode {
    console.log(`Starting BVH construction with ${primitives.length} primitives`);
    if (primitives.length === 0) {
        throw new Error("Cannot build BVH from empty primitive list");
    }
    const aabb = computeAABB(primitives);
    return buildBVHRecursive(primitives, aabb, maxPrimitivesPerLeaf, 0);
}

function buildBVHRecursive(primitives: Primitive[], aabb: AABB, maxPrimitivesPerLeaf: number, depth: number): BVHNode {
    console.log(`Depth ${depth}: Processing ${primitives.length} primitives`);
    const node = new BVHNode(aabb);

    if (primitives.length <= maxPrimitivesPerLeaf) {
        node.primitiveIndices = primitives.map((_, index) => index);
        console.log(`Depth ${depth}: Created leaf node with ${primitives.length} primitives`);
        return node;
    }

    const axis = aabb.getLongestAxis();
    const sortedPrimitives = sortPrimitivesByAxis(primitives, axis);
    const splitIndex = findBestSplitSAH(sortedPrimitives, axis);

    const leftPrimitives = sortedPrimitives.slice(0, splitIndex);
    const rightPrimitives = sortedPrimitives.slice(splitIndex);

    console.log(`Depth ${depth}: Split resulted in ${leftPrimitives.length} left primitives and ${rightPrimitives.length} right primitives`);
    
    if (leftPrimitives.length === 0 || rightPrimitives.length === 0) {
        node.primitiveIndices = primitives.map((_, index) => index);
        console.log(`Depth ${depth}: Split failed, created leaf node with ${primitives.length} primitives`);
        return node;
    }

    const leftAABB = computeAABB(leftPrimitives);
    const rightAABB = computeAABB(rightPrimitives);

    console.log(`Depth ${depth}: Creating left child`);
    node.left = buildBVHRecursive(leftPrimitives, leftAABB, maxPrimitivesPerLeaf, depth + 1);
    console.log(`Depth ${depth}: Creating right child`);
    node.right = buildBVHRecursive(rightPrimitives, rightAABB, maxPrimitivesPerLeaf, depth + 1);

    return node;
}

function computeAABB(primitives: Primitive[]): AABB {
    if (primitives.length === 0) {
        throw new Error("Cannot compute AABB of empty primitive list");
    }

    let aabb = primitives[0].getAABB();
    for (let i = 1; i < primitives.length; i++) {
        const primitiveAABB = primitives[i].getAABB();
        aabb = new AABB(
            Vector3.Minimize(aabb.min, primitiveAABB.min),
            Vector3.Maximize(aabb.max, primitiveAABB.max)
        );
    }
    console.log(`Computed AABB: min(${aabb.min.x}, ${aabb.min.y}, ${aabb.min.z}), max(${aabb.max.x}, ${aabb.max.y}, ${aabb.max.z})`);
    return aabb;
}

function sortPrimitivesByAxis(primitives: Primitive[], axis: number): Primitive[] {
    return primitives.sort((a, b) => {
        const centerA = a.getAABB().getCenter();
        const centerB = b.getAABB().getCenter();
        return centerA.asArray()[axis] - centerB.asArray()[axis];
    });
}

function findBestSplitSAH(primitives: Primitive[], axis: number): number {
    const bucketCount = 12;
    const buckets: { count: number, bounds: AABB }[] = Array(bucketCount).fill(null).map(() => ({ count: 0, bounds: new AABB(new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)) }));

    const sceneBounds = computeAABB(primitives);
    const sceneExtent = sceneBounds.max.subtract(sceneBounds.min);
    
    for (const primitive of primitives) {
        const centroid = primitive.getAABB().getCenter();
        const bucketIndex = Math.min(bucketCount - 1, Math.floor(bucketCount * (centroid.asArray()[axis] - sceneBounds.min.asArray()[axis]) / sceneExtent.asArray()[axis]));
        buckets[bucketIndex].count++;
        buckets[bucketIndex].bounds = new AABB(
            Vector3.Minimize(buckets[bucketIndex].bounds.min, primitive.getAABB().min),
            Vector3.Maximize(buckets[bucketIndex].bounds.max, primitive.getAABB().max)
        );
    }
    
    let minCost = Infinity;
    let bestSplit = -1;
    const totalCount = primitives.length;

    for (let i = 1; i < bucketCount; i++) {
        const leftCount = buckets.slice(0, i).reduce((sum, bucket) => sum + bucket.count, 0);
        const rightCount = totalCount - leftCount;

        if (leftCount === 0 || rightCount === 0) continue;

        const leftBounds = buckets.slice(0, i).reduce((aabb, bucket) => new AABB(
            Vector3.Minimize(aabb.min, bucket.bounds.min),
            Vector3.Maximize(aabb.max, bucket.bounds.max)
        ), new AABB(new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)));

        const rightBounds = buckets.slice(i).reduce((aabb, bucket) => new AABB(
            Vector3.Minimize(aabb.min, bucket.bounds.min),
            Vector3.Maximize(aabb.max, bucket.bounds.max)
        ), new AABB(new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)));

        const leftArea = computeAABBSurfaceArea(leftBounds);
        const rightArea = computeAABBSurfaceArea(rightBounds);

        const cost = 1 + (leftCount * leftArea + rightCount * rightArea) / computeAABBSurfaceArea(sceneBounds);

        if (cost < minCost) {
            minCost = cost;
            bestSplit = i;
        }
    }

    const splitIndex = Math.floor(primitives.length / 2);
    console.log(`SAH split index: ${splitIndex}`);
    return splitIndex;
}

function computeAABBSurfaceArea(aabb: AABB): number {
    const extent = aabb.max.subtract(aabb.min);
    return 2 * (extent.x * extent.y + extent.y * extent.z + extent.z * extent.x);
}