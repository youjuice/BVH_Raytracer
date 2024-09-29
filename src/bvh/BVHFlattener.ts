import { BVHNode } from './BVHNode';

export function flattenBVH(root: BVHNode): Float32Array {
    const nodes: number[] = [];

    function flatten(node: BVHNode): number {
        const nodeIndex = Math.floor(nodes.length / 8);  // 정수로 변환

        // AABB min and max
        nodes.push(
            node.aabb.min.x, node.aabb.min.y, node.aabb.min.z,
            node.aabb.max.x, node.aabb.max.y, node.aabb.max.z
        );
        
        if (node.isLeaf()) {
            // Leaf node
            nodes.push(node.primitiveIndices![0], -node.primitiveIndices!.length);
        } else {
            // Internal node
            nodes.push(0, 0);  // 임시로 0을 넣고, 나중에 업데이트
        }

        const currentIndex = nodeIndex;

        if (!node.isLeaf()) {
            const leftIndex = flatten(node.left!);
            const rightIndex = flatten(node.right!);
            nodes[currentIndex * 8 + 6] = leftIndex;  // leftRight 업데이트
        }

        console.log(`Node ${nodeIndex}: type=${node.isLeaf() ? 'leaf' : 'internal'}, leftRight=${nodes[currentIndex * 8 + 6]}, primitiveCount=${nodes[currentIndex * 8 + 7]}`);
        return nodeIndex;
    }

    flatten(root);
    return new Float32Array(nodes);
}