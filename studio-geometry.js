import * as T from './three.module.js';
import {toCreasedNormals} from './BufferGeometryUtils.js';
import {normalize,sketchProfile} from './studio-design.js';
const TAU=Math.PI*2;
let cachedKey='',cachedMesh;
const polygon=pts=>new T.Shape(pts.map(p=>new T.Vector2(...p)));
function ellipse(cx,cy,rx,ry,n=64){return Array.from({length:n},(_,i)=>[cx+rx*Math.cos(i*TAU/n),cy+ry*Math.sin(i*TAU/n)])}
function roundedRect(x,y,w,h,r){r=Math.min(r,w*.49,h*.49);const p=new T.Shape();p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p}
function star(n,outer,inner,cx=0,cy=.5,rot=Math.PI/2){return Array.from({length:n*2},(_,i)=>{const a=rot+i*Math.PI/n,r=i%2?inner:outer;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]})}
function heart(){return Array.from({length:100},(_,i)=>{const t=i/100*TAU;return [16*Math.sin(t)**3/34,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)+17)/33]})}
function leaf(cx=0,cy=.5,w=.9,h=1,angle=0){return Array.from({length:64},(_,i)=>{const a=i/64*TAU,x=Math.sin(a)*w*.5*(.65+.35*Math.cos(a)),z=Math.cos(a)*h*.5;return [cx+x*Math.cos(angle)-z*Math.sin(angle),cy+x*Math.sin(angle)+z*Math.cos(angle)]})}
export function phoneMesh(raw){
 const cacheKey=JSON.stringify(['designId','style','shape','mood','width','height','depth','tilt','slot','useSketch','sketch','appliedSketch','addition'].map(k=>raw[k]));if(cacheKey===cachedKey&&cachedMesh)return cachedMesh;
 const s=normalize(raw),W=s.width,H=s.height-6,base=s.style==='utilitarian'?9:6,wall=s.style==='utilitarian'?10:s.style==='cubic'?8:7,seat=5+s.slot,lean=Math.tan(s.tilt*Math.PI/180),depth=Math.max(s.depth,Math.ceil(seat+H*lean+wall+9));
 const parts=[];const id=s.designId,outline=s.useSketch?sketchProfile(s.appliedSketch?.length?s.appliedSketch:s.sketch):null,bevel=s.style==='cubic'?.35:s.style==='modern'?1:s.style==='utilitarian'?.65:1.7;
 const profileMatrix=new T.Matrix4().set(1,0,0,0,0,lean,-1,seat+wall,0,1,0,base,0,0,0,1);
 function add(g,material='body',name='body',smooth=true){if(smooth)g=toCreasedNormals(g,Math.PI/3);parts.push({name,material,positions:Array.from(g.getAttribute('position').array),normals:Array.from(g.getAttribute('normal').array),indices:g.index?Array.from(g.index.array):null});g.dispose()}
 function extrude(shape,d,b=bevel){return new T.ExtrudeGeometry(shape,{depth:d,steps:1,curveSegments:18,bevelEnabled:b>0,bevelSegments:4,bevelSize:b,bevelThickness:b})}
 function front(points,holes=[],d=wall,material='body',name='back',b=bevel){function clean(ps,clockwise){let vs=ps.filter((p,i)=>!i||Math.hypot(p[0]-ps[i-1][0],p[1]-ps[i-1][1])>1e-8).map(([x,z])=>new T.Vector2(x*W,z*H));if(vs[0].distanceTo(vs.at(-1))<1e-8)vs.pop();if(T.ShapeUtils.isClockWise(vs)!==clockwise)vs.reverse();return vs}const p=new T.Shape(clean(points,true));for(const h of holes)p.holes.push(new T.Path(clean(h,false)));const g=extrude(p,d,b);g.applyMatrix4(profileMatrix);add(g,material,name)}
 function rect(x,z,w,h,d=wall,material='body',r=bevel,name='back'){const g=extrude(roundedRect(x*W,z*H,w*W,h*H,r*1.7),d,Math.min(bevel,r));g.applyMatrix4(profileMatrix);add(g,material,name)}
 function oval(x,z,rx,rz,d=wall,material='body',name='back'){front(ellipse(x,z,rx,rz),[],d,material,name)}
 function box(x,y,z,w,d,h,material='body',r=bevel,name='body'){const g=extrude(roundedRect(x-w/2,y-d/2,w,d,r),h,Math.min(r,1));g.translate(0,0,z);add(g,material,name)}
 function sphere(x,y,z,rx,ry,rz,material='body',name='detail'){const g=new T.SphereGeometry(1,32,20);g.scale(rx,ry,rz);g.translate(x,y,z);add(g,material,name,false)}
 function frontSphere(x,z,rx,rz,material='body'){sphere(x*W,seat+z*H*lean+wall/2,base+z*H,rx*W,wall*.8,rz*H,material)}
 function tube(points,r,material='body',name='rib',closed=false){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal');let g;if(closed)g=new T.TubeGeometry(curve,Math.max(64,points.length*8),r,12,true);else{const disk=new T.Shape();disk.absarc(0,0,r,0,TAU,false);g=new T.ExtrudeGeometry(disk,{steps:Math.max(24,points.length*8),bevelEnabled:false,curveSegments:6,extrudePath:curve})}add(g,material,name)}
 function ftube(points,r=4,material='body',closed=false){tube(points.map(([x,z])=>[x*W,seat+z*H*lean+(material==='body'?wall/2:-.7),base+z*H]),r,material,'sculptural rib',closed)}
 function ring(cx,cz,rx,rz,th=.105,n=80,material='body'){front(ellipse(cx,cz,rx,rz,n),[ellipse(cx,cz,Math.max(.03,rx-th),Math.max(.03,rz-th),n)],wall,material,'open ring',Math.min(bevel,.8))}
 function faceEyes(y=.65){for(const x of [-.15,.15])frontSphere(x,y,.034,.029,'dark');frontSphere(0,y-.1,.05,.027,'accent')}
 function strut(a,b,r=4,material='body'){tube([a,b],r,material,'support')}
 const baseShape=['cubic','utilitarian'].includes(s.style)?roundedRect(-W*.53,0,W*1.06,depth,3):polygon(ellipse(0,depth/2,W*.57,depth/2));
 add(extrude(baseShape,base,.6),'body','base');
 for(const x of [-W*.28,W*.28])box(x,3,base-.5,W*.31,7,9,'accent',1.2,'phone lip');
 if(outline){front(outline.outer,outline.holes,wall,'body','drawn silhouette',.35);for(const line of outline.lines)if(line.length>1)tube(line.map(([x,z])=>[x*W,seat+z*H*lean-.7,base+z*H]),1.2,'accent','drawn raised line')}
 else switch(id){
 case 'pebble':front(ellipse(0,.48,.46,.5));break;
 case 'monolith':rect(-.43,0,.86,1,wall*1.6,'body',2);break;
 case 'arch':{const arc=(rx,cy,ry)=>Array.from({length:49},(_,i)=>{const a=Math.PI-i/48*Math.PI;return [rx*Math.cos(a),cy+ry*Math.sin(a)]});front([[-.48,0],...arc(.48,.54,.46),[.48,0]],[[[-.28,.05],...arc(.28,.5,.3),[.28,.05]]]);break}
 case 'fold':{const p=polygon([[0,0],[depth,0],[seat+H*lean,H],[seat+H*lean+wall,H],[depth+10,-wall],[0,-wall]]);const g=extrude(p,W*.74,1);g.applyMatrix4(new T.Matrix4().set(0,0,1,-W*.37,1,0,0,0,0,1,0,base,0,0,0,1));add(g,'body','folded side ribbon');break}
 case 'diamond':front([[0,0],[.5,.36],[.32,.78],[0,1],[-.32,.78],[-.5,.36]],[],wall*2);ftube([[0,.02],[0,.98]],1,'accent');ftube([[-.48,.36],[0,.98],[.48,.36]],1,'accent');break;
 case 'halo':ring(0,.52,.49,.49,.115);rect(-.13,0,.26,.19);break;
 case 'moon':{const pts=[];for(let i=0;i<=80;i++){const a=(50+i/80*260)*Math.PI/180;pts.push([Math.cos(a)*.48,.51+Math.sin(a)*.49])}for(let i=0;i<=80;i++){const a=(-90-i/80*180)*Math.PI/180;pts.push([.30+Math.cos(a)*.54,.51+Math.sin(a)*.38])}front(pts,[],wall,'body','crescent',.6);rect(-.2,0,.4,.15);break}
 case 'clover':for(const [x,z]of [[-.23,.37],[.23,.37],[-.23,.73],[.23,.73]])oval(x,z,.26,.25);rect(-.12,0,.24,.3);break;
 case 'infinity':for(const x of [-.22,.22])ring(x,.52,.29,.44,.095);rect(-.18,0,.36,.13);break;
 case 'orbit':ring(0,.52,.5,.43,.075);frontSphere(0,.52,.17,.16,'accent');ftube([[-.4,.25],[0,.52],[.4,.8]],2,'accent');rect(-.11,0,.22,.18);break;
 case 'wave':front([[-.43,0],[.42,0],[.4,.18],[.32,.35],[.15,.52],[.12,.74],[.27,.89],[.12,1],[-.12,.98],[-.35,.8],[-.44,.57]],[],wall*1.8);ftube([[.1,.87],[-.12,.76],[-.22,.55],[-.18,.32]],2,'accent');break;
 case 'ribbon':case 'scroll':{const pts=id==='ribbon'?[[0,4],[0,12],[18,23],[35,27],[28,44],[15,63],[18,82],[30,98]]:[[0,4],[15,8],[23,30],[24,65],[34,90],[49,95],[55,86],[46,81],[36,87]];const center=pts.map(([y,z])=>[0,seat+y*.5+z*lean,z/100*H+base]);for(const x of [-.32,-.16,0,.16,.32])tube(center.map(([_,y,z])=>[x*W,y,z]),W*.095,'body','continuous ribbon');break}
 case 'zigzag':front([[-.45,0],[.45,0],[.45,.12],[-.18,.12],[.45,.88],[.45,1],[-.45,1],[-.45,.88],[.18,.88],[-.45,.12]],[],wall*1.3,'body','zigzag',.6);break;
 case 'accordion':for(let i=0;i<5;i++){const x=-.4+i*.2;front([[x-.09,0],[x+.09,0],[x+.08,.9],[x,1],[x-.08,.9]],[],wall+(i%2)*11,'body','folded fin',.5)}rect(-.5,0,1,.12);break;
 case 'leaf':front(leaf());ftube([[0,.04],[0,.5],[0,.93]],1.6,'accent');for(const z of [.3,.5,.7])for(const x of [-1,1])ftube([[0,z],[x*.24,z+.15]],.8,'accent');break;
 case 'lotus':for(const [x,z,a]of [[-.25,.43,.65],[.25,.43,-.65],[-.14,.57,.3],[.14,.57,-.3],[0,.56,0]])front(leaf(x,z,.48,.88,a),[],wall,x===0?'accent':'body');rect(-.16,0,.32,.16);break;
 case 'sprout':ftube([[0,0],[-.06,.3],[0,.62],[.05,.93]],6);front(leaf(-.22,.58,.46,.62,.8));front(leaf(.23,.74,.45,.55,-.85));break;
 case 'cactus':rect(-.15,0,.3,1,wall*1.7,'body',6);rect(-.43,.3,.15,.39,wall*1.5,'body',5);rect(.27,.46,.15,.36,wall*1.5,'body',5);rect(-.39,.3,.32,.15);rect(.08,.46,.32,.15);for(const x of [-.07,.07])ftube([[x,.08],[x,.88]],.8,'accent');break;
 case 'mushroom':rect(-.17,0,.34,.67,wall*1.5,'body',5);front([[-.5,.58],...Array.from({length:49},(_,i)=>{const a=Math.PI-i/48*Math.PI;return [.5*Math.cos(a),.58+.4*Math.sin(a)]}),[.5,.58]],[],wall*1.5,'accent');for(const [x,z]of [[-.23,.72],[.12,.83],[.3,.68]])frontSphere(x,z,.055,.04,'body');break;
 case 'cat':oval(0,.47,.38,.45);front([[-.35,.65],[-.35,1],[-.11,.81],[.11,.81],[.35,1],[.35,.65]],[],wall);ftube([[.25,.05],[.49,.12],[.5,.34],[.4,.4]],4);faceEyes(.64);break;
 case 'dog':oval(0,.48,.34,.48);for(const x of [-.34,.34])oval(x,.69,.15,.27,wall*1.3,'accent');oval(0,.37,.20,.14,wall*1.5,'accent');faceEyes(.64);break;
 case 'bear':oval(0,.45,.42,.45);for(const x of [-.3,.3])oval(x,.84,.16,.16);oval(0,.38,.21,.15,wall*1.5,'accent');faceEyes(.61);break;
 case 'bunny':oval(0,.33,.36,.35);for(const x of [-.17,.17]){oval(x,.73,.13,.29);oval(x,.77,.055,.18,wall+1,'accent')}faceEyes(.4);break;
 case 'whale':front([[0,0],[.22,.2],[.17,.48],[.46,.65],[.5,.98],[.22,.9],[0,.68],[-.22,.9],[-.5,.98],[-.46,.65],[-.17,.48],[-.22,.2]],[],wall*1.5);ftube([[0,.1],[0,.65]],1.5,'accent');break;
 case 'steps':for(const [x,z,w,h]of [[-.34,0,.29,.4],[0,0,.34,.7],[.32,0,.3,1]])rect(x-w/2,z,w,h,wall*2,'body',.2);break;
 case 'gothic':front([[-.45,0],[-.45,.6],[0,1],[.45,.6],[.45,0]],[[[-.25,.08],[-.25,.55],[0,.8],[.25,.55],[.25,.08]]],wall,'body','pointed window',.5);ftube([[0,.1],[0,.8]],2,'accent');break;
 case 'castle':rect(-.43,0,.86,.63);for(const x of [-.34,.34]){rect(x-.15,0,.3,.95,wall*2,'body',.1);for(const dx of [-.1,0,.1])rect(x+dx-.035,.93,.07,.12,wall*2,'body',.1)}rect(-.09,.12,.18,.3,wall+1,'accent');break;
 case 'column':for(let i=0;i<7;i++)rect(-.32+i*.095,0,.07,.86,wall+2,'body',2);rect(-.45,.81,.9,.17,wall*1.8);rect(-.4,0,.8,.12,wall*1.7);break;
 case 'bridge':for(const x of [-.24,.24])ring(x,.38,.25,.36,.09);rect(-.52,.72,1.04,.16,wall*1.6);rect(-.52,0,1.04,.08);break;
 case 'robot':rect(-.36,.32,.72,.55,wall*1.6,'body',4);rect(-.25,0,.5,.34);for(const x of [-.17,.17])rect(x-.08,.61,.16,.11,wall*1.7,'accent',1);rect(-.16,.43,.32,.05,wall*1.8,'dark',1);ftube([[0,.85],[0,1]],2);frontSphere(0,1,.07,.05,'accent');for(const x of [-.44,.44])rect(x-.06,.42,.12,.32,wall,'accent',2);break;
 case 'rocket':front([[-.22,0],[-.22,.67],[0,1],[.22,.67],[.22,0]],[],wall*2);for(const sign of [-1,1])front([[sign*.15,0],[sign*.5,0],[sign*.4,.4],[sign*.2,.54]],[],wall);ring(0,.6,.13,.12,.045,48,'accent');break;
 case 'mech':front([[-.5,0],[-.38,.78],[-.2,1],[.2,1],[.38,.78],[.5,0]],[[[-.31,.15],[-.22,.72],[0,.85],[.22,.72],[.31,.15]]],wall*1.3,'body','exo frame',.4);for(const x of [-.36,.36])frontSphere(x,.42,.06,.05,'accent');rect(-.19,.08,.38,.12,wall,'accent',1);break;
 case 'gear':front(Array.from({length:48},(_,i)=>{const a=i/48*TAU,r=i%4<2?.5:.42;return [r*Math.cos(a),.51+r*Math.sin(a)]}),[ellipse(0,.51,.25,.25)],wall*1.4,'body','gear',.3);rect(-.16,0,.32,.15);break;
 case 'satellite':rect(-.12,0,.24,.91,wall*1.5,'body',2);for(const sign of [-1,1]){rect(sign*.30-.18,.28,.36,.57,wall*.65,'accent',1);for(const dx of [-.1,0,.1])ftube([[sign*.30+dx,.3],[sign*.30+dx,.82]],.7,'dark');for(const z of [.46,.64])ftube([[sign*.30-.17,z],[sign*.30+.17,z]],.7,'dark')}break;
 case 'cloud':front(Array.from({length:100},(_,i)=>{const a=i/100*TAU,r=1+.10*Math.cos(a*6);return [.46*r*Math.cos(a),.52+.43*r*Math.sin(a)]}));break;
 case 'heart':front(heart(),[],wall*1.4);rect(-.12,0,.24,.18);break;
 case 'star':front(star(5,.52,.24,0,.54),[],wall*1.5);rect(-.12,0,.24,.3);break;
 case 'lightning':front([[-.04,0],[.4,.59],[.12,.59],[.28,1],[-.29,1],[-.42,.43],[-.12,.43]],[],wall*1.6,'body','bolt',.5);break;
 case 'gamepad':front([[-.5,.06],[-.5,.65],[-.37,.83],[-.18,.85],[0,.76],[.18,.85],[.37,.83],[.5,.65],[.5,.06],[.28,0],[.16,.28],[-.16,.28],[-.28,0]],[],wall*2,'body','controller',2);rect(-.35,.45,.24,.07,wall*2+1,'accent',.5);rect(-.265,.37,.07,.23,wall*2+1,'accent',.5);for(const [x,z]of [[.25,.63],[.35,.53],[.15,.53],[.25,.43]])frontSphere(x,z,.035,.035,'accent');break;
 case 'chair':rect(-.39,.17,.78,.81,wall*1.2,'body',5);for(const x of [-W*.47,W*.47])box(x,seat/2+12,base,W*.1,seat+25,H*.37,'body',2,'chair arm');rect(-.32,.25,.64,.6,wall+1,'accent',3);break;
 case 'book':for(const sign of [-1,1])front([[0,0],[sign*.49,.08],[sign*.49,.96],[sign*.12,1],[0,.91]],[],wall*1.7);rect(-.025,0,.05,.93,wall*1.9,'accent',.3);for(const sign of [-1,1])for(const z of [.26,.4,.54,.68,.82])ftube([[sign*.09,z],[sign*.41,z+.04]],.8,'accent');break;
 case 'easel':ftube([[-.47,0],[0,1],[.47,0]],5);ftube([[-.42,.3],[.42,.3]],4,'accent');strut([0,seat+H*lean,base+H*.85],[0,depth-3,base],5);break;
 case 'headphones':ftube(Array.from({length:50},(_,i)=>{const a=i/49*Math.PI;return [.43*Math.cos(a),.45+.5*Math.sin(a)]}),5);for(const x of [-.38,.38])rect(x-.11,.14,.22,.38,wall*2,'accent',4);rect(-.3,0,.6,.15);break;
 case 'vinyl':oval(0,.52,.5,.5,wall);oval(0,.52,.17,.17,wall+1,'accent');for(const r of [.24,.31,.38,.45])ftube(ellipse(0,.52,r,r,64),.6,'dark',true);rect(-.14,0,.28,.13);break;
 case 'honeycomb':for(const [x,z]of [[0,.5],[0,.79],[0,.21],[-.25,.355],[.25,.355],[-.25,.645],[.25,.645]])front(ellipse(x,z,.19,.19,6),[ellipse(x,z,.12,.12,6)],wall,'body','hexagonal cell',.4);rect(-.18,0,.36,.12);break;
 case 'pyramid':front([[-.52,0],[0,1],[.52,0]],[[[-.29,.12],[0,.69],[.29,.12]]],wall*1.8,'body','triangle frame',.4);break;
 case 'voronoi':for(const [x,z,rx,rz]of [[-.25,.25,.22,.24],[.2,.23,.26,.21],[-.22,.65,.23,.25],[.24,.65,.23,.29],[0,.86,.17,.17]])ring(x,z,rx,rz,.065,32);rect(-.18,0,.36,.16);break;
 case 'tripod':{const top=[0,seat+H*.65*lean,base+H*.65];for(const p of [[-W*.42,5,base],[W*.42,5,base],[0,depth-3,base]])strut(p,top,4.5);rect(-.23,.61,.46,.38,wall*1.4,'accent',3);break}
 case 'sunburst':for(let i=0;i<11;i++){const a=(25+i*13)*Math.PI/180;ftube([[0,.02],[.5*Math.cos(a),.1+.88*Math.sin(a)]],3.3)}front([[-.3,0],[.3,0],[0,.38]],[],wall*1.5);break;
 default:rect(-.4,0,.8,1);
 }
 if(s.addition==='wings')for(const sign of [-1,1])front([[sign*.2,.24],[sign*.65,.48],[sign*.73,.93],[sign*.47,.78],[sign*.21,.62]],[],wall*.55,'accent','wing',.6);
 if(s.addition==='ears')for(const sign of [-1,1])front([[sign*.14,.78],[sign*.42,1.13],[sign*.42,.74]],[],wall*.7,'accent','ear',.5);
 if(s.addition==='stars')for(const [x,z,r]of [[-.3,.7,.12],[.2,.8,.14],[.1,.45,.1]])front(star(5,r,r*.45,x,z),[],wall+1,'accent','star',.2);
 if(s.addition==='leaves')for(const sign of [-1,1])front(leaf(sign*.36,.45,.3,.5,sign*.8),[],wall*.7,'accent','leaf');
 if(s.addition==='ribs')for(const x of [-.3,-.15,0,.15,.3])ftube([[x,.08],[x,.86]],1.8,'accent');
 for(const part of parts){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));if(part.indices)g.setIndex(part.indices);if(part.normals)g.setAttribute('normal',new T.Float32BufferAttribute(part.normals,3));const pos=g.getAttribute('position');let warped=false;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),t=Math.max(0,Math.min(1,(z-base)/H));let sx=1,shift=0;if(part.name!=='base'&&part.name!=='phone lip'){
   sx={pebble:1,arch:1-.16*t*t,tapered:1-.4*t,flared:1+.32*t,wave:1+.14*Math.sin(t*Math.PI*3),asymmetric:1}[s.shape];if(s.shape==='asymmetric')shift=.22*W*Math.sin(t*Math.PI*.8);if(s.mood==='playful')shift+=.07*W*Math.sin(t*Math.PI*2);if(s.mood==='bold')sx*=1+.12*t;if(s.mood==='precise')sx*=1-.08*t;if(s.mood==='warm')sx*=1+.05*Math.sin(t*Math.PI);if(s.style==='modern')sx*=1-.12*t;if(s.style==='stylistic')shift+=.08*W*Math.sin(t*Math.PI);warped ||=sx!==1||shift!==0;pos.setX(i,x*sx+shift)}}
  if(warped){const smooth=toCreasedNormals(g,Math.PI/3);part.positions=Array.from(smooth.getAttribute('position').array);part.normals=Array.from(smooth.getAttribute('normal').array);part.indices=smooth.index?Array.from(smooth.index.array):null;smooth.dispose()}g.dispose();
 }
 const vertices=[],triangles=[],components=[];
 for(const part of parts){const offset=vertices.length,p=part.positions,map=new Map(),idx=[];for(let i=0;i<p.length;i+=3){const v=p.slice(i,i+3),key=v.map(x=>Math.round(x*100000)).join(',');let j=map.get(key);if(j===undefined){j=vertices.length;map.set(key,j);vertices.push(v)}idx.push(j)}const order=part.indices||Array.from({length:idx.length},(_,i)=>i),start=triangles.length;for(let i=0;i<order.length;i+=3){const tri=[idx[order[i]],idx[order[i+1]],idx[order[i+2]]];if(new Set(tri).size===3)triangles.push(tri)}components.push({name:part.name,start,count:triangles.length-start,vertexStart:offset,vertexCount:vertices.length-offset})}
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of vertices)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v[i]);max[i]=Math.max(max[i],v[i])}
 cachedKey=cacheKey;cachedMesh={parts,vertices,triangles,components,depth,base,wall,bounds:max.map((v,i)=>v-min[i]),min,max,sketchApplied:!!outline,design:s};return cachedMesh;
}
export function meshSTL(state){const {vertices:v,triangles:t}=phoneMesh(state),rows=['solid Zaffre_Phone_Holder_mm'];for(const tri of t){const [a,b,c]=tri.map(i=>v[i]),u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n);if(l<1e-10)continue;rows.push('facet normal '+n.map(x=>x/l).join(' '),'outer loop',...tri.map(i=>'vertex '+v[i].map(x=>Number(x.toFixed(5))).join(' ')),'endloop','endfacet')}return rows.concat('endsolid Zaffre_Phone_Holder_mm').join('\n')}
