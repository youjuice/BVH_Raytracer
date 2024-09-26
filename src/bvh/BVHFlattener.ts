import { BVHNode } from './BVHNode';

export function flattenBVH(root: BVHNode): number[] {
    const nodes: number[] = [];

    function flatten(node: BVHNode): number {
        const nodeIndex = nodes.length / 8;

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
            const leftIndex = flatten(node.left!);
            nodes.push(leftIndex, 0);
            flatten(node.right!);
        }

        return nodeIndex;
    }

    flatten(root);

    console.log("Flattened BVH:", nodes);
    return nodes;
}