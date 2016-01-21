#version 330 core

//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

#define RAMP(r) r >= 1.0f ? 1.0f : (r <= -1.0f ? -1.0f : 15.0f/8.0f * r - 10.0f / 8.0f * pow(r,3) + 3.0f / 8.0f * pow(r,5) )

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
{
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
}
            
// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v)
{
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                       -0.447213595499958); // -1 + 4 * G4

  // First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

  // Other corners

  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  //  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

  // Permutations
  i = mod289(i); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

  // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

  // Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}

float smoothstep(float edge0, float edge1, float x)
{
  // Scale, bias and saturate x to 0..1 range
  x = clamp((x - edge0)/(edge1 - edge0), 0.0, 1.0); 
  // Evaluate polynomial
  return x*x*(3 - 2*x);
}

// All attribures are from previous state
uniform sampler2D positionSampler2D;
uniform sampler2D velocitySampler2D;
uniform sampler2D accelerationSampler2D;

uniform float dt;
uniform float time;
uniform int size;
out vec4 acceleration_out;

// The vector field potential has three components
vec3 potential(vec3 p)
{
  float L = 0.2;
  float speed = 0.1;
  float alpha;
  vec3 n;
  vec3 pot = vec3(0,0,0);
  pot += L * 0.3 * speed * vec3(
    snoise(vec4(p.x, p.y, p.z, time * 0.01) / L),
    snoise(vec4(p.x, p.y + 49, p.z, time * 0.01) / L),
    snoise(vec4(p.x, p.y, p.z + 49, time * 0.01) / L));
  
  // Rotational potential gives linearly rising vector field
  pot += speed * vec3(-p.z,0,p.x);

  alpha = abs((smoothstep(0.5, 0.5+L, length(p))));
  n = normalize(p);
  pot = (alpha - 0.1) * pot + (1 - (alpha - 0.1)) * n * dot(n, pot);

  //n = closestNormal(p);
  //alpha = abs((smoothstep(0.5,1.1,dot(p, n))) ) / L;
  ////n = vec3(1,0,0);
  //pot = alpha * pot + (1 - alpha) * n * dot(n, pot);
  //
  //alpha = abs((smoothstep(0,1,p.x + 1) - 0.5) * 2) / 100;
  //n = vec3(-1,0,0);
  //pot = alpha * pot + (1 - alpha) * n * dot(n, pot);
  
  //alpha = abs((smoothstep(0,1,p.y - 1) - 0.5) * 2) / 100;
  //n = vec3(0,1,0);
  //pot = alpha * pot + (1 - alpha) * n * dot(n, pot);
  
  //alpha = abs((smoothstep(-1,1,p.x + 1) - 0.5) * 2) / 100;
  //n = vec3(0,-1,0);
  //pot = alpha * pot + (1 - alpha) * n * dot(n, pot);
  
  return pot;
}

void main(){
  vec3 a = texelFetch( accelerationSampler2D, ivec2(gl_FragCoord.xy), 0).xyz;
  vec3 v = texelFetch( velocitySampler2D, ivec2(gl_FragCoord.xy), 0).xyz;
  vec3 p = texelFetch( positionSampler2D, ivec2(gl_FragCoord.xy), 0).xyz;

  float epsilon = 0.001;
  vec3 pot = potential(p);

  // Partial derivatives of different components of the potential
  float dp3_dy = (pot.z - potential(vec3(p.x, p.y + epsilon, p.z))).z / epsilon;
  float dp2_dz = (pot.y - potential(vec3(p.x, p.y, p.z + epsilon))).y / epsilon;
  float dp1_dz = (pot.x - potential(vec3(p.x, p.y, p.z + epsilon))).x / epsilon;
  float dp3_dx = (pot.z - potential(vec3(p.x + epsilon, p.y, p.z))).z / epsilon;
  float dp2_dx = (pot.y - potential(vec3(p.x + epsilon, p.y, p.z))).y / epsilon;
  float dp1_dy = (pot.x - potential(vec3(p.x, p.y + epsilon, p.z))).x / epsilon;

  // vel = nabla x potential
  // Since this vecotor field has only a vector potential component
  // it is divergent free and hence contains no sources
  vec3 vel = vec3(dp3_dy - dp2_dz, dp1_dz - dp3_dx, dp2_dx - dp1_dy);
  vec3 v_goal = vel;

  // Update the acceleration for particles to follow the velocity field
  float friction = 1;
  a = friction * (v_goal - v);

  acceleration_out = vec4(a.xyz,1);
}