// All noise, palette, density, transverse dimensions and optical coefficients are art settings.
// They are NOT measured temperatures, gas velocities, turbulence scales or optical properties.
export const noise = `
float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.1,.2,.3)); p *= 17.;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float detail(vec3 p) { return noise3(p)*.65 + noise3(p*2.07+9.)*.35; }
`
export const vertexShader = `
varying vec3 vLocal;
void main() { vLocal=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`
export const fireFragment = `
uniform float uTime, uFlow;
uniform vec3 uEye;
uniform vec2 uResolution;
uniform sampler2D uBackground, uDepth;
uniform mat4 uClip;
varying vec3 vLocal;
${noise}
float density(vec3 p) {
  // Advection is solely along the declared flow axis. No time-dependent vertical drift.
  vec3 q=p*vec3(3.8,8.,6.)-vec3(uTime*.65*uFlow,0.,0.);
  q.y+=.45*sin(q.x*1.7); q.z+=.35*sin(q.x*1.3+2.);
  float n=detail(q);
  vec2 curl=vec2(noise3(q*.7+4.),noise3(q*.7+19.))-.5;
  vec2 transverse=p.yz+curl*.19;
  float radial=length(transverse*vec2(2.5,2.25));
  float longitudinal=smoothstep(-.5,-.34,p.x)*(1.-smoothstep(.30,.5,p.x));
  float body=1.-smoothstep(.08,.88,radial);
  float filaments=smoothstep(.48,.72,n+body*.24);
  return longitudinal*body*pow(filaments,1.4);
}
void main() {
  vec3 ray=normalize(vLocal-uEye);
  vec3 inv=1./(sign(ray)*max(abs(ray),vec3(.00001)) + vec3(.0000001));
  vec3 a=(-.5-uEye)*inv, b=(.5-uEye)*inv;
  vec3 lo=min(a,b), hi=max(a,b);
  float enter=max(max(lo.x,lo.y),lo.z), leave=min(min(hi.x,hi.y),hi.z);
  enter=max(enter,0.); if(leave<=enter) discard;
  vec2 screen=gl_FragCoord.xy/uResolution;
  float solidDepth=texture2D(uDepth,screen).r;
  float stepSize=(leave-enter)/40.;
  vec4 total=vec4(0.);
  for(int i=0;i<40;i++) {
    vec3 p=uEye+ray*(enter+(float(i)+.5)*stepSize);
    vec4 clip=uClip*vec4(p,1.);
    if(clip.z/clip.w*.5+.5 > solidDepth+.00002) break;
    float d=density(p);
    float core=smoothstep(.40,.80,d);
    vec3 palette=mix(vec3(.95,.045,.002),vec3(1.,.32,.018),smoothstep(.05,.35,d));
    palette=mix(palette,vec3(1.,.82,.34),core);
    float alpha=1.-exp(-d*stepSize*10.);
    total.rgb+=(1.-total.a)*alpha*palette;
    total.a+=(1.-total.a)*alpha;
    if(total.a>.97) break;
  }
  if(total.a<.003) discard;
  // Subtle refraction of the rendered background, not a temperature/refractive-index model.
  vec2 ripple=vec2(noise3(vLocal*7.+vec3(-uTime*.65*uFlow,0,0)),
                   noise3(vLocal*7.+vec3(-uTime*.65*uFlow,9,3)))-.5;
  vec3 refracted=texture2D(uBackground,clamp(screen+ripple*.004*total.a,.001,.999)).rgb;
  vec3 color=mix(refracted,total.rgb/max(total.a,.001),smoothstep(.0,.30,total.a));
  gl_FragColor=vec4(color,total.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
export const surfaceFragment = `
uniform float uFront, uBase, uTime;
varying vec3 vLocal;
${noise}
void main() {
  float x=vLocal.x*4.;
  float grain=detail(vLocal*vec3(110.,80.,140.));
  float weave=.5+.5*sin(vLocal.x*1300.)*sin(vLocal.z*360.);
  float burnMask=smoothstep(uBase-.015,uBase+.015,x)*(1.-smoothstep(uFront-.015,uFront+.015,x));
  float charred=1.-smoothstep(uBase-.015,uBase+.015,x);
  vec3 virgin=vec3(.53,.46,.34)*(.65+grain*.3+weave*.15);
  float cracks=smoothstep(.42,.51,noise3(vLocal*75.));
  vec3 residue=mix(vec3(.012,.016,.02),vec3(.065,.058,.052),cracks)*(.65+grain*.5);
  vec3 color=mix(virgin,residue,charred);
  float pulse=detail(vLocal*20.-vec3(uTime*.65,0,0));
  color=mix(color,vec3(.20,.047,.012)*(1.+pulse),burnMask*.8);
  color+=vec3(.5,.07,.006)*burnMask*smoothstep(.64,.9,pulse)*.45;
  // Lighting/shading is decorative; no radiometry or measured fabric texture.
  color*=.8+.2*abs(normalize(cross(dFdx(vLocal),dFdy(vLocal))).y);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
