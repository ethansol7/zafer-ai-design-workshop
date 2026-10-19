// Original closed, concave extrusion. Coordinates and STL exports are millimeters.
export function cableMesh(width=60,channel=6){
 width=Math.max(40,Math.min(80,Number(width)||60));channel=Math.max(4,Math.min(12,Number(channel)||6));
 const a=(width-channel)/2,b=(width+channel)/2,p=[[0,0],[width,0],[width,12],[b,12],[b,6],[a,6],[a,12],[0,12]];
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const ids=p.map((_,i)=>i),caps=[];
 while(ids.length>3){let found=false;for(let k=0;k<ids.length;k++){const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];if(cross(p[a],p[b],p[c])<=0)continue;if(ids.some(t=>![a,b,c].includes(t)&&Math.min(cross(p[a],p[b],p[t]),cross(p[b],p[c],p[t]),cross(p[c],p[a],p[t]))>=-1e-8))continue;caps.push([a,b,c]);ids.splice(k,1);found=true;break}if(!found)throw Error('Invalid cross-section')}
 caps.push([...ids]);const vertices=[0,24].flatMap(y=>p.map(([x,z])=>[x,y,z]));const triangles=[...caps,...caps.map(([a,b,c])=>[a+8,c+8,b+8])];
 for(let i=0;i<8;i++){const j=(i+1)%8;triangles.push([i,i+8,j+8],[i,j+8,j])}return {vertices,triangles,width,channel};
}
export function meshSTL(width,channel){const {vertices:v,triangles:t}=cableMesh(width,channel);const rows=['solid Zafer_ONE_mm'];for(const tri of t){const [a,b,c]=tri.map(i=>v[i]),u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]);let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n);n=n.map(x=>x/l);rows.push('facet normal '+n.join(' '),'outer loop',...tri.map(i=>'vertex '+v[i].join(' ')),'endloop','endfacet')}return rows.concat('endsolid Zafer_ONE_mm').join('\n')}
