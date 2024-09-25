#version 300 es
precision highp float;
precision highp int;

const int MAX_BOUNCES = 3;

uniform mat4 worldViewProjection;               // 월드 및 뷰 변환 행렬
uniform vec3 cameraPosition;                    // 카메라 위치
uniform vec3 cameraDirection;                   // 카메라 방향
uniform vec3 cameraUp;
uniform vec3 cameraRight;
uniform float aspectRatio;                      // 화면 비율
uniform float fov;                              // 카메라의 시야각
uniform vec4 spheres[SPHERE_COUNT];             // 구체 데이터
uniform vec3 lightPosition;                     // 빛의 위치
uniform vec2 resolution;                        // 화면 해상도
uniform sampler2D bvhTexture;
uniform float bvhTextureSize;

out vec4 fragColor;                             // 최종적으로 출력되는 픽셀 색상

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Hit {
    bool didHit;
    float distance;
    vec3 position;
    vec3 normal;
    int sphereIndex;
};

struct BVHNode {
    vec3 aabbMin;
    vec3 aabbMax;
    float leftRight;        // 내부 노드의 경우 왼쪽 자식, 리프 노드의 경우 프리미티브 인덱스
    float primitiveCount;   // 내부 노드의 경우 0, 리프 노드의 경우 프리미티브 수
};

Ray createCameraRay(vec2 uv) {
    vec2 ndc = uv * 2.0 - 1.0;
    ndc.x *= aspectRatio;

    vec3 direction = normalize(cameraDirection + cameraRight * ndc.x * tan(fov * 0.5) + cameraUp * ndc.y * tan(fov * 0.5));

    return Ray(cameraPosition, direction);
}

Hit intersectSphere(Ray ray, vec4 sphere) {
    vec3 oc = ray.origin - sphere.xyz;
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(oc, ray.direction);
    float c = dot(oc, oc) - sphere.w * sphere.w;
    float discriminant = b * b - 4.0 * a * c;

    Hit result;
    result.didHit = false;
    result.distance = 1e30;
    result.position = vec3(0.0);
    result.normal = vec3(0.0);
    result.sphereIndex = -1;

    if (discriminant >= 0.0) {
        float t = (-b - sqrt(discriminant)) / (2.0 * a);
        if (t > 0.0) {
            result.didHit = true;
            result.distance = t;
            result.position = ray.origin + t * ray.direction;
            result.normal = normalize(result.position - sphere.xyz);
        }
    }

    return result;
}

bool intersectAABB(Ray r, vec3 boxMin, vec3 boxMax, out float tMin, out float tMax) {
    vec3 invDir = 1.0 / r.direction;
    vec3 t0s = (boxMin - r.origin) * invDir;
    vec3 t1s = (boxMax - r.origin) * invDir;
    vec3 tSmaller = min(t0s, t1s);
    vec3 tBigger = max(t0s, t1s);
    tMin = max(tSmaller.x, max(tSmaller.y, tSmaller.z));
    tMax = min(tBigger.x, min(tBigger.y, tBigger.z));

    return tMax > tMin && tMax > 0.0;
}

BVHNode getBVHNode(int index) {
    float y = floor(float(index) / bvhTextureSize);
    float x = float(index) - y * bvhTextureSize;
    vec2 uv = vec2(x, y) / bvhTextureSize;
    
    vec4 data1 = texture(bvhTexture, uv);
    vec4 data2 = texture(bvhTexture, vec2(uv.x + 1.0 / bvhTextureSize, uv.y));
    
    BVHNode node;
    node.aabbMin = data1.xyz;
    node.aabbMax = data2.xyz;
    node.leftRight = data1.w;
    node.primitiveCount = data2.w;
    
    return node;
}

Hit traverseBVH(Ray r) {
    Hit result;
    result.didHit = false;
    result.distance = 1e30;

    int stack[64];
    int stackPtr = 0;
    stack[stackPtr++] = 0;

    while (stackPtr > 0) {
        int nodeIndex = stack[--stackPtr];
        BVHNode node = getBVHNode(nodeIndex);

        float tMin, tMax;
        if (intersectAABB(r, node.aabbMin, node.aabbMax, tMin, tMax)) {
            if (tMin > result.distance) {
                continue;
            }

            if (node.primitiveCount < 0.0) {  // Leaf node
                int primitiveCount = int(-node.primitiveCount);
                int firstPrimitiveIndex = int(node.leftRight);
                for (int i = 0; i < primitiveCount; i++) {
                    int sphereIndex = firstPrimitiveIndex + i;
                    Hit hit = intersectSphere(r, spheres[sphereIndex]);
                    if (hit.didHit && hit.distance < result.distance) {
                        result = hit;
                        result.sphereIndex = sphereIndex;
                    }
                }
            } else {  // Internal node
                int leftChildIndex = int(node.leftRight);
                int rightChildIndex = leftChildIndex + 1;
                
                BVHNode leftChild = getBVHNode(leftChildIndex);
                BVHNode rightChild = getBVHNode(rightChildIndex);
                
                float leftDist, leftMax, rightDist, rightMax;
                bool hitLeft = intersectAABB(r, leftChild.aabbMin, leftChild.aabbMax, leftDist, leftMax);
                bool hitRight = intersectAABB(r, rightChild.aabbMin, rightChild.aabbMax, rightDist, rightMax);
                
                // Push children to stack in front-to-back order
                if (hitLeft && hitRight) {
                    if (leftDist < rightDist) {
                        stack[stackPtr++] = rightChildIndex;
                        stack[stackPtr++] = leftChildIndex;
                    } else {
                        stack[stackPtr++] = leftChildIndex;
                        stack[stackPtr++] = rightChildIndex;
                    }
                } else if (hitLeft) {
                    stack[stackPtr++] = leftChildIndex;
                } else if (hitRight) {
                    stack[stackPtr++] = rightChildIndex;
                }
            }
        }
    }

    return result;
}

bool isInShadow(vec3 position, vec3 lightDir) {
    Ray shadowRay = Ray(position + lightDir * 0.001, lightDir);
    Hit hit = traverseBVH(shadowRay);
    return hit.didHit;
}

vec3 calculateLighting(vec3 position, vec3 normal, vec3 viewDir) {
    vec3 lightDir = normalize(lightPosition - position);

    vec3 ambient = vec3(0.1);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = vec3(0.7) * diff;
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = vec3(0.5) * spec;
    float shadow = isInShadow(position, lightDir) ? 0.5 : 1.0;

    return (ambient + (diffuse + specular) * shadow);
}

vec3 traceRay(Ray initialRay) {
    vec3 color = vec3(0.0);
    vec3 rayColor = vec3(1.0);
    Ray currentRay = initialRay;

    for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
        Hit closestHit = traverseBVH(currentRay);

        if (closestHit.didHit) {
            vec3 viewDir = normalize(cameraPosition - closestHit.position);
            vec3 localColor = calculateLighting(closestHit.position, closestHit.normal, viewDir);

            color += rayColor * localColor * 0.8;

            // 반사 설정
            vec3 reflectDir = reflect(currentRay.direction, closestHit.normal);
            currentRay = Ray(closestHit.position + reflectDir * 0.001, reflectDir);
            rayColor *= 0.2;  // 반사가 진행될수록 빛의 세기 감소
        } else {
            // 배경색 추가
            color += rayColor * vec3(0.2, 0.2, 0.2);
            break;
        }
    }

    return color;
}

void main() {
    vec3 color = vec3(0.0);
    int samples = 4;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv = uv * 2.0 - 1.0;  // -1 to 1 range
    uv.x *= aspectRatio;

    for (int i = 0; i < samples; i++) {
        for (int j = 0; j < samples; j++) {
            vec2 offset = vec2(float(i), float(j)) / float(samples);
            vec2 uv = (gl_FragCoord.xy + offset) / resolution.xy;
            Ray ray = createCameraRay(uv);
            color += traceRay(ray);
        }
    }

    color /= float(samples * samples);
    fragColor = vec4(color, 1.0);
}