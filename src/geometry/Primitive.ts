import { AABB } from './AABB';

export interface Primitive {
    getAABB(): AABB;
}