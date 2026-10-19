import {defaults as oldDefaults,normalize as oldNormalize,interpretIdea as vocabulary,styles,shapes,moods,palettes as oldPalettes,fitReport} from './studio-vocabulary.js';
import {catalog,byId,finishes,additions,startingDesign} from './studio-catalog.js';
export {styles,shapes,moods,fitReport};
export const palettes={...oldPalettes,gold:'#ccaa64',silver:'#b6c0ca',copper:'#bb805b',navy:'#344f73',mint:'#91c7b1',coral:'#d78a75',brown:'#a07954',turquoise:'#57a9a7'};
export const defaults=()=>({...oldDefaults(),designId:'pebble',finish:'ceramic',accent:'#e4c59b',addition:'none',width:85,height:105,slot:16});
export function normalize(raw={}){
 const input=raw&&typeof raw==='object'?raw:{},s=oldNormalize({...defaults(),...input,variations:[]});
 s.designId=byId(s.designId).id;if(!Object.hasOwn(finishes,s.finish))s.finish='ceramic';if(!Object.hasOwn(additions,s.addition))s.addition='none';s.accent=/^#[a-f0-9]{6}$/i.test(s.accent)?s.accent:'#e4c59b';s.appliedSketch=oldNormalize({sketch:input.appliedSketch||s.sketch,variations:[]}).sketch;
 s.variations=Array.isArray(input.variations)?input.variations.slice(-3).filter(v=>v&&typeof v==='object').map(v=>normalize({...v,variations:[]})):[];return s;
}
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function hits(text,word){return [...text.matchAll(new RegExp('\\b'+esc(word).replace(/ /g,'[ -]+')+'\\b','g'))].filter(m=>!/(?:not|no|without|remove)\s+(?:a\s+|the\s+)?$/.test(text.slice(Math.max(0,m.index-20),m.index)))}
export function interpretIdea(text,current){
 const t=String(text).toLowerCase().replace(/\b(phone|holder)s\b/g,'$1'),before=normalize(current);let s={...before},picked=[],warnings=[];
 const detailZones=[...t.matchAll(/\b(?:with|add|plus|give it)\s+(?:(?:some|the|a|small|little|large)\s+)?(?:[a-z]+\s+|#[a-f0-9]{6}\s+)?(?:wings|cat ears|pointed ears|stars|star details|star pattern|leaves|leaf details|leaf pattern|ribs|ridges)\b/g)];
 const formText=detailZones.reduce((value,m)=>value.replace(m[0],' '.repeat(m[0].length)),t);
 const ranked=catalog.map(d=>({d,score:Math.max(0,...[d.name.toLowerCase(),...d.keywords].filter(k=>hits(formText,k).length).map(k=>k.length+3))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 if(ranked.length){const chosen=ranked[0].d;if(chosen.id!==s.designId){s=startingDesign(chosen.id,s);s.width=before.width;s.height=before.height;s.depth=before.depth;s.tilt=before.tilt;s.slot=before.slot;if(before.briefMade&&/^(make it|turn it|change|keep|same)/.test(t)){s.color=before.color;s.accent=before.accent;s.finish=before.finish}}picked.push('form: '+chosen.name)}
 const baseColor=s.color,old=vocabulary(formText,s);s={...s,...old.design};picked.push(...old.picked);s.prompt=String(text).slice(0,1600);
 const finishWords={matte:['matte','plastic','rubber','silicone','soft touch','soft-touch'],ceramic:['ceramic','glazed','glossy','porcelain','pottery'],metal:['metal','metallic','aluminum','aluminium','steel','chrome','brass'],walnut:['wood','wooden','walnut','oak','timber','bamboo'],stone:['stone','marble','concrete','granite','sandstone'],glass:['glass','resin','transparent','translucent','frosted','clear']};
 const fs=Object.entries(finishWords).flatMap(([k,words])=>words.flatMap(w=>hits(t,w).map(m=>({k,index:m.index})))).sort((a,b)=>a.index-b.index);if(fs.length){s.finish=fs.at(-1).k;picked.push('finish: '+finishes[s.finish])}
 const cs=Object.entries(palettes).flatMap(([name,color])=>hits(t,name).map(m=>({name,color,index:m.index})));for(const m of t.matchAll(/#[a-f0-9]{6}\b/g))cs.push({name:m[0],color:m[0],index:m.index});cs.sort((a,b)=>a.index-b.index);
 if(cs.length){const bodyColors=cs.filter(c=>!detailZones.some(m=>c.index>=m.index&&c.index<m.index+m[0].length)&&!/(?:accent|details?)\s*(?:color|colour)?\s*(?:is|to|in|:)??\s*$/.test(t.slice(Math.max(0,c.index-22),c.index))),accentColors=cs.filter(c=>!bodyColors.includes(c));s.color=bodyColors[0]?.color||baseColor;picked=picked.filter(p=>!p.startsWith('color:'));if(bodyColors.length)picked.push('color: '+bodyColors[0].name);const accent=accentColors.at(-1)||(bodyColors.length>1?bodyColors.at(-1):null);if(accent){s.accent=accent.color;picked.push('accent: '+accent.name)}}
 const extras={wings:['wings','winged','dragon','butterfly'],ears:['cat ears','pointed ears'],stars:['stars','star details','star pattern'],leaves:['leaf details','leaf pattern','leaves'],ribs:['ribs','ribbed','ridges','fluted details']};
 for(const [value,words]of Object.entries(extras))if(words.some(w=>hits(t,w).length)){s.addition=value;picked.push('detail: '+additions[value])}
 if(/\b(no|without|remove)\s+(the\s+)?(wings|ears|stars|leaves|ribs|details|additions)\b/.test(t)){s.addition='none';picked.push('detail: removed')}
 const relative={width:[['wider','broader'],['narrower','slimmer']],height:[['taller','higher'],['shorter','lower']],depth:[['deeper'],['shallower']],tilt:[['more tilted','lean back more'],['more upright','less tilted']]};
 for(const [key,[more,less]]of Object.entries(relative)){const amount=key==='tilt'?5:15;if(more.some(w=>hits(t,w).length)){s[key]+=amount;picked.push(key+': increased')}if(less.some(w=>hits(t,w).length)){s[key]-=amount;picked.push(key+': reduced')}}
 if(/\b(smaller|compact|travel|portable)\b/.test(t)){s.width=65;s.height=75;s.depth=65;picked.push('proportions: compact')}
 if(/\b(larger|oversized|big)\b/.test(t)){s.width=110;s.height=130;s.depth=110;picked.push('proportions: larger')}
 if(/\b(use|keep)\s+(my|the)\s+(sketch|drawing|outline)\b/.test(t)&&sketchProfile(s.sketch)){s.useSketch=true;picked.push('outline: your sketch')}
 if(/\b(motor|wireless|magnetic|hinged|foldable|moving|articulated|charging coil)\b/.test(t))warnings.push('Moving parts and electronics need a separate CAD design; this preview stays a static holder.');
 if(/\bdragon\b/.test(t))warnings.push('Wings are an available motif; a detailed dragon is beyond this local collection.');
 if(ranked.length>1&&ranked[1].score>=8&&ranked[1].d.id!==s.designId&&!['stars','leaves','ears'].includes(s.addition))warnings.push('Used '+ranked[0].d.name+' as the main form. '+ranked[1].d.name+' is also available in the collection.');
 s.briefMade=!!s.prompt.trim();s.explored=before.explored||picked.length>0;if(picked.length){s.sizeKept=false;s.fitChecked=false;s.downloaded=false}
 const result=normalize(s),adjusted=['width','height','depth','tilt','slot'].some(k=>s[k]!==result[k]);
 const changed=['designId','style','shape','mood','color','accent','finish','addition','width','height','depth','tilt','slot','useSketch'].filter(k=>result[k]!==before[k]);
 return {design:result,picked:[...new Set(picked)],warnings,adjusted,changed,suggestions:(ranked.length?ranked.slice(0,3).map(x=>x.d):catalog.filter(d=>['cat','wave','halo'].includes(d.id))).map(d=>d.id)};
}

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function area(p){return p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1]},0)/2}
function simplify(p,tol=.003){if(p.length<=3)return p;const a=p[0],b=p.at(-1);let max=0,index=0;for(let i=1;i<p.length-1;i++){const l=(b[0]-a[0])**2+(b[1]-a[1])**2,t=l?Math.max(0,Math.min(1,((p[i][0]-a[0])*(b[0]-a[0])+(p[i][1]-a[1])*(b[1]-a[1]))/l)):0,d=distance(p[i],[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);if(d>max){max=d;index=i}}return max>tol?[...simplify(p.slice(0,index+1),tol).slice(0,-1),...simplify(p.slice(index),tol)]:[a,b]}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes}
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10}
export function sketchProfile(strokes){
 if(!Array.isArray(strokes))return null;const joined=strokes.filter(p=>p.length>=2).map(p=>p.map(v=>[...v]));for(let i=0;i<joined.length;i++){let merged=true;while(merged&&distance(joined[i][0],joined[i].at(-1))>.025){merged=false;for(let j=i+1;j<joined.length;j++){let next=joined[j];if(distance(joined[i].at(-1),next.at(-1))<.035)next=[...next].reverse();if(distance(joined[i].at(-1),next[0])<.035){joined[i].push(...next.slice(1));joined.splice(j,1);merged=true;break}}}}
 const paths=joined.map(p=>simplify(p.filter((v,i)=>!i||distance(v,p[i-1])>.001))).filter(p=>p.length>=2);
 if(!paths.length)return null;paths.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));let outer=paths[0];if(Math.abs(area(outer))<.015)return null;
 if(distance(outer[0],outer.at(-1))<.02)outer=outer.slice(0,-1);if(outer.length<3)return null;
 for(let i=0;i<outer.length;i++)for(let j=i+2;j<outer.length;j++){if(i===0&&j===outer.length-1)continue;if(intersects(outer[i],outer[(i+1)%outer.length],outer[j],outer[(j+1)%outer.length]))return null}
 const xs=outer.map(p=>p[0]),ys=outer.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(maxX-minX<.08||maxY-minY<.12)return null;
 const map=([x,y])=>[(x-(minX+maxX)/2)/(maxX-minX)*.9,(maxY-y)/(maxY-minY)*.97];
 const holes=[],lines=[];for(const p of paths.slice(1)){if(p.every(v=>inside(v,outer))){if(distance(p[0],p.at(-1))<.06&&Math.abs(area(p))>.003){const h=distance(p[0],p.at(-1))<.02?p.slice(0,-1):p;if(h.length>=3)holes.push(h.map(map))}else lines.push(p.map(map))}}
 return {outer:outer.map(map),holes,lines,points:outer.length,ignored:paths.slice(1).filter(p=>!p.every(v=>inside(v,outer))).length};
}
