/** Small, actual XYZ meshes, orthographic projection and directional lighting.
 * Canvas is the rasterizer; the platformer and character remain two dimensional.
 * Meshes are cached. No model downloads, WebGL dependency or physics changes.
 */
const ELEVATION = .23;
const CE = Math.cos(ELEVATION), SE = Math.sin(ELEVATION);
const LIGHT = [-.4, .78, -.48];
const cache = new Map();
const shadeCache = new Map();
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract = (a,b) => a.map((v,i)=>v-b[i]);

function face(mesh, points, color) {
  const normal=cross(subtract(points[1],points[0]),subtract(points[2],points[0]));
  const length=Math.hypot(...normal)||1;
  mesh.push({points,normal:normal.map(v=>v/length),color});
}
function box(mesh,x,y,z,w,h,d,color) {
  const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y+h,z-d/2],[x-w/2,y+h,z-d/2],
    [x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]];
  for(const indices of [[0,3,2,1],[4,5,6,7],[1,2,6,5],[0,4,7,3],[3,7,6,2],[0,1,5,4]])face(mesh,indices.map(i=>p[i]),color);
}
function roof(mesh,y,w,h,d,color) {
  const p=[[-w/2,y,-d/2],[w/2,y,-d/2],[0,y+h,-d/2],[-w/2,y,d/2],[w/2,y,d/2],[0,y+h,d/2]];
  for(const indices of [[0,2,1],[3,4,5],[0,3,5,2],[1,2,5,4]])face(mesh,indices.map(i=>p[i]),color);
}
function rotateZ(mesh,angle,offset=[0,0,0]) {
  const c=Math.cos(angle),s=Math.sin(angle);
  return mesh.map(f=>({...f,points:f.points.map(([x,y,z])=>[x*c-y*s+offset[0],x*s+y*c+offset[1],z+offset[2]]),normal:[f.normal[0]*c-f.normal[1]*s,f.normal[0]*s+f.normal[1]*c,f.normal[2]]}));
}
function litColor(color,normal) {
  const factor=.69+Math.max(0,normal.reduce((n,v,i)=>n+v*LIGHT[i],0))*.35;
  const key=`${color}:${Math.round(factor*64)}`;
  if(shadeCache.has(key))return shadeCache.get(key);
  const hex=color.slice(1),rgb=[0,2,4].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor)));
  const result=`rgb(${rgb.join(',')})`;shadeCache.set(key,result);return result;
}
export function projectPoint([x,y,z],yaw=.34) {
  const c=Math.cos(yaw),s=Math.sin(yaw),rx=x*c+z*s,rz=-x*s+z*c;
  return {x:rx,y:-y*CE-rz*SE,depth:rz*CE-y*SE};
}
export function drawMesh(ctx,mesh,{x=0,y=0,scale=1,yaw=.34,spin=0,alpha=1,projection='ortho'}={}) {
  const geometry=spin?rotateZ(mesh,spin):mesh;
  const c=Math.cos(yaw),s=Math.sin(yaw),faces=[];
  for(const f of geometry){
    const nz=-f.normal[0]*s+f.normal[2]*c;
    const facing=projection==='oblique'?f.normal[0]*.35+f.normal[1]*.2-f.normal[2]:f.normal[1]*SE-nz*CE;
    if(facing<=.001)continue;
    const points=f.points.map(p=>projection==='oblique'?{x:p[0]+p[2]*.35,y:-p[1]-p[2]*.2,depth:p[2]-.35*p[0]-.2*p[1]}:projectPoint(p,yaw));
    faces.push({points,depth:points.reduce((n,p)=>n+p.depth,0)/points.length,color:litColor(f.color,f.normal)});
  }
  faces.sort((a,b)=>b.depth-a.depth);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
  ctx.lineJoin='round';ctx.lineWidth=.55;
  for(const f of faces){ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.strokeStyle=f.color;ctx.fill();ctx.stroke();}
  ctx.restore();
}
export function getProp(kind='cottage') {
  if(cache.has(kind))return cache.get(kind);
  const m=[],wood='#94704a',dark='#4e5844',paper='#fff0cb';
  if(kind==='cottage'||kind==='cottage-red'||kind==='mill'){
    box(m,0,0,0,132,76,74,'#e6d4ac');box(m,0,0,0,146,8,86,'#94866b');
    roof(m,76,160,43,98,kind==='cottage-red'?'#ad7e5c':kind==='mill'?'#5e7565':'#617c70');
    box(m,0,70,0,160,8,98,wood);
    for(const x of [-61,-23,23,61])box(m,x,8,-39,6,66,4,wood);
    for(const y of [25,49,73])box(m,0,y,-40,132,4,4,wood);
    box(m,-4,8,-42,24,42,3,'#535846');
    for(const x of [-42,40]){box(m,x,37,-43,21,22,4,'#354e49');box(m,x,46,-46,22,3,2,paper);box(m,x,37,-46,3,22,2,paper);}
    box(m,-3,0,-47,39,6,16,'#b6a389');
    if(kind==='mill'){box(m,72,0,-28,12,95,24,wood);box(m,72,80,-29,32,8,42,wood);}
   }else if(kind==='windmill'){
    const p=[[-37,0,-26],[37,0,-26],[23,112,-17],[-23,112,-17],[-37,0,26],[37,0,26],[23,112,17],[-23,112,17]];
    for(const indices of [[0,3,2,1],[4,5,6,7],[1,2,6,5],[0,4,7,3],[3,7,6,2]])face(m,indices.map(i=>p[i]),'#e9d9b1');
    box(m,0,0,0,86,7,67,'#aca382');roof(m,112,75,35,64,'#ad7e5c');
    box(m,0,9,-28,20,32,4,'#655c43');box(m,0,64,-24,15,19,4,'#6e8b78');box(m,0,100,-28,13,13,20,wood);
  }else if(kind==='sails'){
    for(let i=0;i<4;i++){
      const blade=[];box(blade,0,0,0,6,84,9,'#94704a');box(blade,7,34,-5,19,45,4,'#f9edc9');
      for(const y of [45,61,76])box(blade,7,y,-8,20,2,2,'#b69a6a');
      m.push(...rotateZ(blade,i*Math.PI/2));
    }
    box(m,0,-7,0,14,14,15,'#9b7d51');
  }else if(kind==='wheel'){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,segment=[];
      box(segment,0,48,0,26,11,16,wood);m.push(...rotateZ(segment,a));
      const spoke=[];box(spoke,0,0,0,7,47,10,'#b39163');m.push(...rotateZ(spoke,a));
    }
    box(m,0,-9,0,18,18,24,'#6b6652');
  }else if(kind==='shrine'){
    box(m,0,0,0,94,7,34,'#aaa48b');
    for(const x of [-31,31])box(m,x,5,0,10,85,24,wood);
    box(m,0,30,-12,52,52,9,wood);box(m,0,35,-19,44,42,3,paper);
    box(m,0,88,0,88,7,36,wood);roof(m,94,100,18,48,dark);
    for(const x of [-41,41]){box(m,x,64,-5,3,18,3,wood);box(m,x,52,-5,13,15,13,'#f0c87b');box(m,x,66,-5,16,3,16,dark);}
  }else if(kind==='gate'){
    for(const x of [-39,39]){box(m,x,0,0,17,10,34,'#a2a58a');box(m,x,10,0,12,108,22,'#af7053');}
    box(m,0,92,0,92,8,24,'#be8060');box(m,0,115,0,112,10,30,'#98684d');box(m,0,125,0,120,5,34,dark);
    box(m,0,94,-17,26,20,5,paper);
  }else if(kind==='lantern'){
    box(m,0,0,0,22,7,22,'#a4a58a');box(m,0,7,0,8,27,8,'#a4a58a');box(m,0,34,0,22,24,22,paper);roof(m,58,34,12,34,dark);
  }
  cache.set(kind,m);return m;
}
export function drawProp(ctx,kind,options){drawMesh(ctx,getProp(kind),options);}

export function drawRaisedPlatform(ctx,p,{bridge=false}={}){
  // The front top edge remains at the collision surface. Depth extends behind it.
  const key=`platform:${p.w}:${p.h}:${bridge}`;
  if(!cache.has(key)){const mesh=[];box(mesh,0,0,18,p.w,p.h,36,bridge?'#bb9364':'#a3a68b');cache.set(key,mesh);}
  drawMesh(ctx,cache.get(key),{x:p.x+p.w/2,y:p.y+p.h,projection:'oblique'});
  ctx.fillStyle=bridge?'#f2d9a0':'#dae0b6';ctx.fillRect(p.x,p.y,p.w,3);
  ctx.fillStyle=bridge?'#876844':'#787e62';
  for(let x=p.x+12;x<p.x+p.w;x+=bridge?20:40)ctx.fillRect(x,p.y+4,2,p.h-7);
}
