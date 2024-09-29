import { BVHNode } from './BVHNode';
import { AABB } from '../geometry/AABB';
import { Vector3 } from "babylonjs";
import { Primitive } from "../geometry/Primitive";

function expandRootAABB(aabb: AABB, expansionFactor: number = 1.6): AABB {
    const center = aabb.getCenter();
    const extent = aabb.max.subtract(aabb.min).scale(0.5 * expansionFactor);
    return new AABB(
        center.subtract(extent),
        center.add(extent)
    );
}

export function buildBVH(primitives: Primitive[], maxPrimitivesPerLeaf: number = 4): BVHNode {
    if (primitives.length === 0) {
        throw new Error("Cannot build BVH from empty primitive list");
    }
    let aabb = computeAABB(primitives);
    aabb = expandRootAABB(aabb); // 루트 AABB 확장
    return buildBVHRecursive(primitives, aabb, maxPrimitivesPerLeaf, 0);
}

function buildBVHRecursive(primitives: Primitive[], aabb: AABB, maxPrimitivesPerLeaf: number, depth: number): BVHNode {
    console.log(`Depth ${depth}: Building node for ${primitives.length} primitives`);
    const node = new BVHNode(aabb);

    if (primitives.length <= maxPrimitivesPerLeaf || depth > 20) {
        node.primitiveIndices = primitives.map((_, index) => index);
        console.log(`Depth ${depth}: Created leaf node with ${primitives.length} primitives`);
        return node;
    }

    const axis = aabb.getLongestAxis();
    const sortedPrimitives = sortPrimitivesByAxis(primitives, axis);
    let splitIndex = findBestSplitSAH(sortedPrimitives, axis);

    // 분할 실패 시 중간점으로 강제 분할
    if (splitIndex <= 0 || splitIndex >= sortedPrimitives.length) {
        splitIndex = Math.floor(sortedPrimitives.length / 2);
        console.log(`Depth ${depth}: Split failed, forced middle split at index ${splitIndex}`);
    }

    const leftPrimitives = sortedPrimitives.slice(0, splitIndex);
    const rightPrimitives = sortedPrimitives.slice(splitIndex);

    const leftAABB = computeAABB(leftPrimitives);
    const rightAABB = computeAABB(rightPrimitives);

    node.left = buildBVHRecursive(leftPrimitives, leftAABB, maxPrimitivesPerLeaf, depth + 1);
    node.right = buildBVHRecursive(rightPrimitives, rightAABB, maxPrimitivesPerLeaf, depth + 1);

    console.log(`Depth ${depth}: Created internal node with ${leftPrimitives.length} left primitives and ${rightPrimitives.length} right primitives`);
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
    
    // 버킷에 프리미티브 분배
    for (const primitive of primitives) {
        const centroid = primitive.getAABB().getCenter();
        const bucketIndex = Math.min(bucketCount - 1, Math.floor(bucketCount * (centroid.asArray()[axis] - sceneBounds.min.asArray()[axis]) / sceneExtent.asArray()[axis]));
        buckets[bucketIndex].count++;
        buckets[bucketIndex].bounds = new AABB(
            Vector3.Minimize(buckets[bucketIndex].bounds.min, primitive.getAABB().min),
            Vector3.Maximize(buckets[bucketIndex].bounds.max, primitive.getAABB().max)
        );
    }
    
    // 각 분할 지점에서의 비용 계산
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
        
        // 최소 비용 갱신
        if (cost < minCost) {
            minCost = cost;
            bestSplit = i;
        }
    }

    if (bestSplit === -1 || minCost > totalCount) {
        // SAH가 분할을 추천하지 않는 경우, 중간점으로 분할
        return Math.floor(primitives.length / 2);
    }

    // SAH가 추천한 지점으로 분할
    let splitCount = 0;
    for (let i = 0; i < bestSplit; i++) {
        splitCount += buckets[i].count;
    }

    // splitCount가 적절한 범위 내에 있는지 확인
    splitCount = Math.max(1, Math.min(splitCount, primitives.length - 1));

    console.log(`SAH split index: ${splitCount}`);
    return splitCount;
}

function computeAABBSurfaceArea(aabb: AABB): number {
    const extent = aabb.max.subtract(aabb.min);
    return 2 * (extent.x * extent.y + extent.y * extent.z + extent.z * extent.x);
}