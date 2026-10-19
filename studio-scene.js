import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {OrbitControls} from './OrbitControls.js';
import {phoneMesh} from './studio-geometry.js';
import {productGroup,disposeProduct,studioEnvironment} from './studio-materials.js';

// Camera paths in glTF's Y-up coordinate system, converted from the Blender studio.
const views=[{p:[12,12,17],t:[-1,1.2,0]}, {p:[3.8,3.5,5.4],t:[0,1.95,-.35]}, {p:[3.4,3.5,4.8],t:[0,1.95,-.35]}, {p:[8,4.9,4],t:[4.7,1.9,-2.4]}, {p:[8.4,4.6,8.2],t:[4.7,2.1,2.5]}];
export async function createStudio(container,initial){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e3d9');scene.fog=new THREE.Fog('#e6e3d9',35,65);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(40,1,.1,100);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=28;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.47;controls.zoomSpeed=.65;
 scene.add(new THREE.HemisphereLight(0xfff2dc,0x777d68,2.3));const sun=new THREE.DirectionalLight(0xffefd5,3);sun.position.set(-5,14,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:40});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);const fill=new THREE.DirectionalLight(0xd5e3e2,1);fill.position.set(5,5,-8);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xe6e3d9,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.51;floor.receiveShadow=true;scene.add(floor);
 const gltf=await new GLTFLoader().loadAsync('studio.glb');gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.name.startsWith('REFERENCE_PRODUCT'))o.visible=false}});scene.add(gltf.scene);
 const productEnvironment=studioEnvironment(renderer);
 const model=new THREE.Group();model.position.set(0,1.17,-.35);model.scale.setScalar(.017);scene.add(model);
 const checkModel=new THREE.Group();checkModel.position.set(4.65,1.74,-2.38);checkModel.scale.setScalar(.017*.6);scene.add(checkModel);
 const printedModel=new THREE.Group();printedModel.position.set(4.5,2.07,2.5);printedModel.scale.setScalar(.017*.28);scene.add(printedModel);
 const phone=new THREE.Group();const shell=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x3b4748,transparent:true,opacity:.42,roughness:.3}));const screen=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({color:0xd6e4d5,transparent:true,opacity:.6,side:THREE.DoubleSide}));phone.add(shell,screen);phone.visible=false;scene.add(phone);let latest=initial,phoneOn=false;
 function phonePlacement(){const m=phoneMesh(latest),scale=.017*(step===3?.6:step===4?.28:1),anchor=step===3?checkModel.position:step===4?printedModel.position:model.position,angle=latest.tilt*Math.PI/180,h=150,depth=latest.phone,midY=(5+latest.slot)+(h/2)*Math.sin(angle)-depth/2*Math.cos(angle);phone.position.set(anchor.x,anchor.y+(m.base+h/2*Math.cos(angle)+depth/2*Math.sin(angle))*scale,anchor.z-(midY-m.depth/2)*scale);phone.rotation.x=-angle;phone.scale.setScalar(scale);shell.scale.set(latest.phoneWidth,h,depth);screen.scale.set(latest.phoneWidth-6,h-9,1);screen.position.z=depth/2+.12;phone.visible=phoneOn}
 let step=initial.step,transition=null;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function move(v,immediate=false){const toP=new THREE.Vector3(...v.p),toT=new THREE.Vector3(...v.t);if(immediate||reduced.matches){camera.position.copy(toP);controls.target.copy(toT);transition=null}else transition={start:performance.now(),fromP:camera.position.clone(),fromT:controls.target.clone(),toP,toT};controls.update();renderer.render(scene,camera)}
 function setStep(n,immediate=false){step=n;move(views[n],immediate);phonePlacement()}
 function focusProduct(){move(step===3?views[3]:step===4?views[4]:views[1])}
 controls.addEventListener('start',()=>transition=null);
 function updateModel(state){latest=state;const data=phoneMesh(state);checkModel.clear();printedModel.clear();disposeProduct(model);const fresh=productGroup(data,state);while(fresh.children.length)model.add(fresh.children[0]);for(const child of model.children){child.material.envMap=productEnvironment;child.material.envMapIntensity=state.finish==='metal'?1:.5;checkModel.add(child.clone());printedModel.add(child.clone())}phonePlacement();renderer.render(scene,camera)}
 updateModel(initial);setStep(step,true);
 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera)};new ResizeObserver(resize).observe(container);resize();
 let frame=0;function tick(time){frame=requestAnimationFrame(tick);if(transition){const t=Math.max(0,Math.min(1,(time-transition.start)/1050)),s=t*t*(3-2*t);camera.position.lerpVectors(transition.fromP,transition.toP,s);controls.target.lerpVectors(transition.fromT,transition.toT,s);if(t===1)transition=null}controls.update();renderer.render(scene,camera)}frame=requestAnimationFrame(tick);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);container.dispatchEvent(new CustomEvent('studio-lost',{bubbles:true}))});
 return {setStep,updateModel,focusProduct,roomView:()=>move(views[0]),showPhone:(on)=>{phoneOn=on;phonePlacement()},dispose:()=>{cancelAnimationFrame(frame);renderer.dispose();controls.dispose()}};
}
