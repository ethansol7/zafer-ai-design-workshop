import * as T from './three.module.js';
// Original lightweight appearance shaders. No third-party texture files are redistributed.
export function makeFinish(finish,color,accent=false){
 const settings={matte:{roughness:.7},ceramic:{roughness:.22,clearcoat:1,clearcoatRoughness:.16},metal:{metalness:.85,roughness:.3},walnut:{roughness:.44,clearcoat:.18},stone:{roughness:.84},glass:{roughness:.2,metalness:.05,transparent:true,opacity:.66,clearcoat:1}};
 const mat=new T.MeshPhysicalMaterial({color,...settings[finish],envMapIntensity:finish==='metal'?1.6:1});
 if(['walnut','stone','matte','metal'].includes(finish)){
  mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vFinishPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishPosition = position;');shader.fragmentShader='varying vec3 vFinishPosition;\nfloat finishHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.543)))*43758.5453);}\n'+shader.fragmentShader;
   const code=finish==='walnut'?'float grain=sin(vFinishPosition.z*.75+sin(vFinishPosition.x*.06)*5.0+sin(vFinishPosition.y*.09)*3.0); diffuseColor.rgb *= .80+.20*smoothstep(-.9,.9,grain);':finish==='stone'?'float fleck=finishHash(floor(vFinishPosition*2.2));diffuseColor.rgb *= .92+.08*fleck;':finish==='metal'?'float brush=.97+.03*sin(vFinishPosition.z*12.0);diffuseColor.rgb *= brush;':'diffuseColor.rgb *= .985+.015*finishHash(floor(vFinishPosition*6.0));';
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
  };mat.customProgramCacheKey=()=>finish;
 }
 return mat;
}
export function productGroup(data,state){const group=new T.Group(),materials={body:makeFinish(state.finish,state.color),accent:makeFinish(state.finish,state.accent,true),dark:makeFinish('matte','#343b3e')};
 for(const p of data.parts){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));if(p.indices)g.setIndex(p.indices);g.applyMatrix4(new T.Matrix4().set(1,0,0,0,0,0,1,0,0,-1,0,data.depth/2,0,0,0,1));const m=new T.Mesh(g,materials[p.material]||materials.body);m.castShadow=true;m.receiveShadow=true;group.add(m)}return group;
}
export function disposeProduct(group){const materials=new Set();group.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material)}});materials.forEach(m=>m.dispose());group.clear()}
export function studioEnvironment(renderer){const env=new T.Scene();env.background=new T.Color('#d7dad8');const floor=new T.Mesh(new T.BoxGeometry(30,30,30),new T.MeshBasicMaterial({color:'#b9c0bd',side:T.BackSide}));env.add(floor);for(const [x,y,z,w,h]of [[-8,6,3,5,12],[6,8,-3,6,12],[0,10,0,10,10]]){const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:0xffffff}));panel.position.set(x,y,z);panel.lookAt(0,0,0);env.add(panel)}const pmrem=new T.PMREMGenerator(renderer),texture=pmrem.fromScene(env,0).texture;pmrem.dispose();env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});return texture}

