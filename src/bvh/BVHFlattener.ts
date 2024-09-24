import { BVHNode } from './BVHNode';
import { Vector3 } from 'babylonjs';

export function flattenBVH(root: BVHNode): number[] {
    const nodes: number[] = [];
    const MAX_NODES = 1000; // 적절한 최대 노드 수 설정

    function flatten(node: BVHNode): number {
        if (nodes.length / 8 >= MAX_NODES) {
            throw new Error("BVH node count exceeded maximum limit");
        }

        const nodeIndex = nodes.length / 8;

        // AABB 데이터 검증
        const minVec = Vector3.Minimize(node.aabb.min, node.aabb.max);
        const maxVec = Vector3.Maximize(node.aabb.min, node.aabb.max);

        // AABB min and max
        nodes.push(minVec.x, minVec.y, minVec.z, maxVec.x, maxVec.y, maxVec.z);

        if (node.isLeaf()) {
            if (!node.primitiveIndices || node.primitiveIndices.length === 0) {
                throw new Error("Leaf node has no primitives");
            }
            nodes.push(node.primitiveIndices[0], -node.primitiveIndices.length);
        } else {
            if (!node.left || !node.right) {
                throw new Error("Internal node is missing child nodes");
            }
            const leftIndex = flatten(node.left);
            const rightIndex = flatten(node.right);
            nodes.push(leftIndex, rightIndex);
        }

        return nodeIndex;
    }

    try {
        flatten(root);
    } catch (error) {
        console.error("Error flattening BVH:", error);
        return [];
    }

    return nodes;
}