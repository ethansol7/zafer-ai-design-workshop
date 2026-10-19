import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {OrbitControls} from './OrbitControls.js';
import {cableMesh} from './studio-geometry.js';
const colors={clay:0xb85c35,sage:0x82966f,ink:0x3b4748};
// Camera paths in glTF's Y-up coordinate system, converted from the Blender studio.
const views=[{p:[12,12,17],t:[-1,1.2,0]}, {p:[-7,5.9,7],t:[-4.7,2,-2.3]}, {p:[4.2,4.2,6.2],t:[0,1.65,-.45]}, {p:[8,4.9,4],t:[4.7,1.9,-2.4]}, {p:[8.4,4.6,8.2],t:[4.7,2.1,2.5]}];
export async function createStudio(container,initial){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e3d9');scene.fog=new THREE.Fog('#e6e3d9',35,65);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(40,1,.1,100);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=28;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.47;controls.zoomSpeed=.65;
 scene.add(new THREE.HemisphereLight(0xfff2dc,0x777d68,2.3));const sun=new THREE.DirectionalLight(0xffefd5,3);sun.position.set(-5,14,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:40});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight(0xd5e3e2,1);fill.position.set(5,5,-8);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xe6e3d9,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.51;floor.receiveShadow=true;scene.add(floor);
 const gltf=await new GLTFLoader().loadAsync('studio.glb');gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.name.startsWith('REFERENCE_PRODUCT'))o.visible=false}});scene.add(gltf.scene);
 const modelMat=new THREE.MeshStandardMaterial({color:colors.clay,roughness:.5});const model=new THREE.Mesh(new THREE.BufferGeometry(),modelMat);model.position.set(0,1.17,-.35);model.castShadow=true;model.receiveShadow=true;scene.add(model);const checkModel=new THREE.Mesh(model.geometry,modelMat);checkModel.position.set(4.65,1.74,-2.38);checkModel.scale.setScalar(.6);checkModel.castShadow=true;scene.add(checkModel);
 const cable=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.85,24),new THREE.MeshStandardMaterial({color:0x303731,roughness:.65}));cable.rotation.x=Math.PI/2;cable.position.set(0,1.17+.18+.105,-.35);cable.visible=false;cable.castShadow=true;scene.add(cable);
 let step=initial.step,transition=null;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function setStep(n,immediate=false){step=n;const v=views[n];const toP=new THREE.Vector3(...v.p),toT=new THREE.Vector3(...v.t);if(immediate||reduced.matches){camera.position.copy(toP);controls.target.copy(toT);transition=null}else transition={start:performance.now(),fromP:camera.position.clone(),fromT:controls.target.clone(),toP,toT};cable.visible=n===3;if(n===3){cable.position.set(4.65,1.74+.18*.6+.105*.6,-2.38);cable.scale.setScalar(.6)}controls.update();}
 controls.addEventListener('start',()=>transition=null);
 function updateModel(state){const data=cableMesh(state.width,state.channel),positions=[];for(const face of data.triangles)for(const i of face){const [x,y,z]=data.vertices[i];positions.push((x-data.width/2)*.03,z*.03,-(y-12)*.03)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const old=model.geometry;model.geometry=g;checkModel.geometry=g;old.dispose();modelMat.color.setHex(colors[state.look]||colors.clay);}
 updateModel(initial);setStep(step,true);
 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()};new ResizeObserver(resize).observe(container);resize();
 let frame=0;function tick(time){frame=requestAnimationFrame(tick);if(document.hidden)return;if(transition){const t=Math.min(1,(time-transition.start)/1050),s=t*t*(3-2*t);camera.position.lerpVectors(transition.fromP,transition.toP,s);controls.target.lerpVectors(transition.fromT,transition.toT,s);if(t===1)transition=null}controls.update();renderer.render(scene,camera)}frame=requestAnimationFrame(tick);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);container.dispatchEvent(new CustomEvent('studio-lost',{bubbles:true}))});
 return {setStep,updateModel,resetView:()=>setStep(step),dispose:()=>{cancelAnimationFrame(frame);renderer.dispose();controls.dispose()}};
}
