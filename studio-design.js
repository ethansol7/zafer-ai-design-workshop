// Local, explainable design vocabulary. No AI service or private agent logic.
export const styles=['organic','cubic','modern','stylistic','utilitarian'];
export const shapes=['pebble','arch','tapered','flared','wave','asymmetric'];
export const moods=['calm','playful','bold','warm','precise'];
export const palettes={clay:'#b85c35',sage:'#82966f',graphite:'#3b4748',cream:'#e9dfc9',lavender:'#a79ac3',blue:'#668da8',pink:'#cc8d9d',yellow:'#d2ab43',red:'#ae493e',orange:'#d78245',green:'#659576',black:'#292e2e',white:'#eeeae1',purple:'#8e6aa7',teal:'#4f9694'};
export const defaults=()=>({step:0,prompt:'',style:'organic',shape:'pebble',mood:'calm',color:palettes.sage,width:80,height:95,depth:85,tilt:18,slot:15,phone:11,phoneWidth:76,sketch:[],useSketch:false,briefMade:false,explored:false,sizeKept:false,fitChecked:false,testPlanned:false,downloaded:false,variations:[]});
const clamp=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
export function normalize(raw={}){
 const s={...defaults(),...raw};
 for(const [k,min,max] of [['step',0,4],['width',55,125],['height',65,140],['depth',60,140],['tilt',5,35],['slot',8,24],['phone',5,22],['phoneWidth',50,100]])s[k]=Math.round(clamp(s[k],min,max,defaults()[k]));
 for(const [k,list] of [['style',styles],['shape',shapes],['mood',moods]])if(!list.includes(s[k]))s[k]=defaults()[k];
 s.color=/^#[a-f0-9]{6}$/i.test(s.color)?s.color:palettes.sage;s.prompt=String(s.prompt||'').slice(0,1600);
 s.sketch=Array.isArray(s.sketch)?s.sketch.slice(0,40).filter(Array.isArray).map(stroke=>stroke.slice(0,400).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(([x,y])=>[clamp(x,0,1,0),clamp(y,0,1,0)])):[];
 for(const k of ['useSketch','briefMade','explored','sizeKept','fitChecked','testPlanned','downloaded'])s[k]=s[k]===true;
 s.variations=Array.isArray(s.variations)?s.variations.slice(0,3).map(v=>{const {variations,...design}=v||{};return {...normalize({...design,variations:[]}),variations:[]}}):[];return s;
}
export function interpretIdea(text,current){
 const s=normalize(current),picked=[],t=String(text).toLowerCase();s.prompt=String(text).slice(0,1600);
 const map={style:{organic:'organic|natural|flowing|soft|rounded|smooth|biomorphic',cubic:'cubic|cube|blocky|boxy|geometric|angular|brutalist',modern:'modern|minimal|minimalist|sleek|scandinavian',stylistic:'stylistic|sculptural|artistic|expressive|funky|art deco',utilitarian:'utilitarian|functional|practical|industrial|sturdy|rugged'},shape:{pebble:'pebble|stone|oval|rounded',arch:'arch|arched|dome',tapered:'tapered|taper|slim|triangle|triangular',flared:'flared|flare|fan|wide top',wave:'wave|wavy|ripple|ocean',asymmetric:'asymmetric|asymmetrical|off.center|quirky'},mood:{calm:'calm|quiet|serene|zen|peaceful',playful:'playful|fun|joyful|cheerful|whimsical',bold:'bold|dramatic|strong|statement',warm:'warm|cozy|cosy|earthy',precise:'precise|technical|clean|focused'}};
 for(const [key,dict] of Object.entries(map)){const hits=Object.entries(dict).flatMap(([value,words])=>[...t.matchAll(new RegExp('\\b('+words+')\\b','g'))].filter(m=>!/(?:not|no|without)\s+$/.test(t.slice(Math.max(0,m.index-10),m.index))).map(m=>({value,index:m.index})));hits.sort((a,b)=>a.index-b.index);if(hits.length){s[key]=hits.at(-1).value;picked.push(`${key}: ${s[key]}`)}}
 const colors=Object.entries(palettes).flatMap(([name,hex])=>[...t.matchAll(new RegExp('\\b'+name+'\\b','g'))].filter(m=>!/(?:not|no|without)\s+$/.test(t.slice(Math.max(0,m.index-10),m.index))).map(m=>({hex,index:m.index,name})));
 for(const m of t.matchAll(/#[a-f0-9]{6}\b/g))colors.push({hex:m[0],index:m.index,name:m[0]});colors.sort((a,b)=>a.index-b.index);if(colors.length){s.color=colors.at(-1).hex;picked.push('color: '+colors.at(-1).name)}
 for(const [key,terms] of Object.entries({width:'wide|width',height:'tall|high|height',depth:'deep|depth',slot:'slot|gap|pocket',tilt:'tilt|lean|angle'})){const re=new RegExp('(?:(\\d+(?:\\.\\d+)?)\\s*(?:mm|millimeters?|degrees?|°)?\\s*(?:'+terms+')|(?:'+terms+')\\s*(?:of|:|=)?\\s*(\\d+(?:\\.\\d+)?))','g');const m=[...t.matchAll(re)].at(-1);if(m){s[key]=Number(m[1]||m[2]);picked.push(`${key}: ${s[key]}${key==='tilt'?'°':' mm'}`)}}
 s.briefMade=Boolean(s.prompt.trim());s.explored=picked.length>0;s.sizeKept=false;s.fitChecked=false;s.downloaded=false;const result=normalize(s);return {design:result,picked,adjusted:picked.some(p=>{const k=p.split(':')[0];return typeof s[k]==='number'&&s[k]!==result[k]})};
}
export function sketchProfile(strokes){
 const points=strokes.flat();if(points.length<8)return null;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(maxX-minX<.08||maxY-minY<.12)return null;
 const samples=Array.from({length:21},(_,i)=>{const y=minY+(maxY-minY)*(1-i/20),hits=[];for(const stroke of strokes)for(let j=1;j<stroke.length;j++){const a=stroke[j-1],b=stroke[j];if(y>=Math.min(a[1],b[1])-.0001&&y<=Math.max(a[1],b[1])+.0001){if(Math.abs(b[1]-a[1])<.0001)hits.push(a[0],b[0]);else hits.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]))}}if(hits.length<2)return null;const l=Math.min(...hits),r=Math.max(...hits);return {width:Math.max(.35,(r-l)/(maxX-minX)),center:((r+l)/2-(maxX+minX)/2)/(maxX-minX)}});
 if(samples.filter(Boolean).length<7)return null;for(let i=0;i<samples.length;i++)if(!samples[i]){const nearest=samples.map((p,j)=>p?{p,d:Math.abs(i-j)}:null).filter(Boolean).sort((a,b)=>a.d-b.d)[0];samples[i]={...nearest.p}}
 return samples.map((p,i)=>{const ns=samples.slice(Math.max(0,i-1),i+2);return {width:ns.reduce((s,p)=>s+p.width,0)/ns.length,center:ns.reduce((s,p)=>s+p.center,0)/ns.length}});
}
export function fitReport(s){const required=s.phone/Math.cos(s.tilt*Math.PI/180),clearance=s.slot-required,fits=clearance>=1;return {required,clearance,fits,message:fits?`${clearance.toFixed(1)} mm nominal room after accounting for the lean. Try a small fit test next.`:`The pocket needs about ${(required+1).toFixed(1)} mm for this phone and a 1 mm teaching allowance. Widen it or reduce the lean.`}}
