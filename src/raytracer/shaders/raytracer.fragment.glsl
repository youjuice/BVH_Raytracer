#version 300 es
precision highp float;

#define SPHERE_COUNT 3
const int MAX_BOUNCES = 3;

uniform mat4 worldViewProjection;       // 월드 및 뷰 변환 행렬
uniform vec3 cameraPosition;            // 카메라 위치
uniform vec3 cameraDirection;           // 카메라 방향
uniform vec3 cameraUp;
uniform vec3 cameraRight;
uniform float aspectRatio;              // 화면 비율
uniform float fov;                      // 카메라의 시야각
uniform vec4 spheres[SPHERE_COUNT];     // 구체 데이터
uniform vec3 lightPosition;             // 빛의 위치
uniform vec2 resolution;                // 화면 해상도
out vec4 fragColor;                     // 최종적으로 출력되는 픽셀 색상

struct Ray {                            // 광선 구조체
    vec3 origin;
    vec3 direction;
};

struct Hit {                            // 광선과 구체의 교차 정보
    bool didHit;
    float distance;
    vec3 position;
    vec3 normal;
};

// 카메라 광선 생성
Ray createCameraRay(vec2 uv) {
    vec2 ndc = uv * 2.0 - 1.0;
    ndc.x *= aspectRatio;

    vec3 direction = normalize(cameraDirection + cameraRight * ndc.x * tan(fov * 0.5) + cameraUp * ndc.y * tan(fov * 0.5));

    return Ray(cameraPosition, direction);
}

// 광선과 구체의 교차점 계산
Hit intersectSphere(Ray ray, vec4 sphere) {
    vec3 oc = ray.origin - sphere.xyz;
    float b = dot(oc, ray.direction);
    float c = dot(oc, oc) - sphere.w * sphere.w;
    float discriminant = b * b - c;

    if (discriminant < 0.0) return Hit(false, 0.0, vec3(0.0), vec3(0.0));

    float t = -b - sqrt(discriminant);
    if (t < 0.0) t = -b + sqrt(discriminant);
    if (t < 0.0) return Hit(false, 0.0, vec3(0.0), vec3(0.0));

    vec3 position = ray.origin + ray.direction * t;
    vec3 normal = normalize(position - sphere.xyz);

    return Hit(true, t, position, normal);
}

// 그림자 유무 판단
bool isInShadow(vec3 position, vec3 lightDir) {
    Ray shadowRay = Ray(position + lightDir * 0.001, lightDir);
    for (int i = 0; i < SPHERE_COUNT; i++) {
        Hit hit = intersectSphere(shadowRay, spheres[i]);
        if (hit.didHit) {
            return true;
        }
    }
    return false;
}

// 조명 계산
vec3 calculateLighting(vec3 position, vec3 normal, vec3 viewDir) {
    vec3 lightDir = normalize(lightPosition - position);

    // 앰비언트
    vec3 ambient = vec3(0.1);

    // 디퓨즈
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = vec3(0.7) * diff;

    // 스페큘러
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = vec3(0.5) * spec;

    // 그림자
    float shadow = isInShadow(position, lightDir) ? 0.5 : 1.0;

    return (ambient + (diffuse + specular) * shadow);
}

// 광선 추적
vec3 traceRay(Ray initialRay) {
    vec3 color = vec3(0.0);
    vec3 rayColor = vec3(1.0);
    Ray currentRay = initialRay;

    for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
        Hit closestHit;
        closestHit.didHit = false;
        closestHit.distance = 1e20;

        for (int i = 0; i < SPHERE_COUNT; i++) {
            Hit hit = intersectSphere(currentRay, spheres[i]);
            if (hit.didHit && hit.distance < closestHit.distance) {
                closestHit = hit;
            }
        }

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