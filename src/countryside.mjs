import { drawProp, drawMesh, getProp, projectPoint, drawRaisedPlatform } from './low-poly.mjs';

export const COUNTRY_THEMES = {
  wordwood:{sky:['#a8d5d0','#f9e8b8'],hills:['#b4c7a1','#8eaf83','#729670'],grass:'#77954c',leaf:'#76955e',flowers:'#e9ce9a',sun:'#fff2c0',water:'#78b4b1'},
  workshop:{sky:['#b7d4cf','#f3deb4'],hills:['#b6c2a0','#97ac79','#829863'],grass:'#8f9a50',leaf:'#708953',flowers:'#e8b475',sun:'#ffe6ac',water:'#82b5af'},
  sky:{sky:['#e3bfa5','#fae5b5'],hills:['#c3b3a1','#a4a180','#818c67'],grass:'#9b9858',leaf:'#a78b56',flowers:'#e9a889',sun:'#ffe4a2',water:'#a6bcb0'},
};
const font='"Yu Gothic", "Noto Sans JP", sans-serif';
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const polygon=(ctx,points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
const ellipse=(ctx,x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};

function cloud(ctx,x,y,scale=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.fillStyle='#fff8df';
  ctx.fillRect(-52,0,112,17);ctx.fillRect(-35,-12,77,20);ctx.fillRect(-10,-24,43,28);ctx.fillStyle='#e6dec130';ctx.fillRect(-43,12,94,5);ctx.restore();
}
function tree(ctx,x,y,scale,theme,seed){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  ellipse(ctx,8,2,39,6,'#45584416');ctx.fillStyle='#8d7654';ctx.fillRect(-6,-73,12,75);ctx.fillRect(-18,-48,17,7);
  const color=theme.leaf;polygon(ctx,[[-53,-52],[-39,-81],[-46,-99],[-18,-113],[0,-139],[31,-119],[48,-94],[43,-65],[20,-48]],color);
  polygon(ctx,[[-40,-91],[-22,-110],[0,-132],[25,-116],[20,-96],[-7,-88]],'#b9bd7e77');
  ctx.fillStyle='#dae3a04a';ctx.fillRect(-20,-107,17,6);ctx.fillRect(16,-82,12,5);
  if(seed%3===0){ctx.fillStyle=theme.flowers;for(const [dx,dy] of [[-30,-78],[26,-100],[5,-121],[35,-71]])ctx.fillRect(dx,dy,4,4);}
  ctx.restore();
}
function hills(ctx,W,H,camera,theme){
  for(let layer=0;layer<3;layer++){
    const step=240,offset=camera.x*(.045+layer*.07),base=H*.64+layer*47;
    const points=[[-step,H+50]];
    for(let i=Math.floor(offset/step)-1;i<=Math.floor((offset+W)/step)+1;i++){
      const x=i*step-offset,y=base-55-hash(i+layer*30)*90;
      points.push([x,y+48],[x+55,y+16],[x+120,y],[x+177,y+12],[x+step,y+45]);
    }
    points.push([W+step,H+50]);polygon(ctx,points,theme.hills[layer]);
  }
}
function riceFields(ctx,W,base,camera,theme){
  const offset=camera.x*.19;
  for(let i=-1;i<4;i++){
    const y=base+i*34;
    polygon(ctx,[[-100,y],[W+100,y-32],[W+100,y-5],[-100,y+28]],i%2?'#aeb773':'#bdc784');
    ctx.strokeStyle='#e1d9a66b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-100,y+24);ctx.lineTo(W+100,y-9);ctx.stroke();
    ctx.fillStyle=theme.grass;
    for(let x=-(offset%32);x<W+40;x+=32){const sy=y+12-x/W*28;ctx.fillRect(x,sy-6,2,8);ctx.fillRect(x-3,sy-4,2,4);ctx.fillRect(x+4,sy-5,2,5);}
  }
}
export function drawCountryside(ctx,{worldId,W,H,camera,time,motion,pulse=0}){
  const theme=COUNTRY_THEMES[worldId]||COUNTRY_THEMES.wordwood;
  const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,theme.sky[0]);gradient.addColorStop(1,theme.sky[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  const sunX=W*.79-camera.x*.025,sunY=H*.19;
  ellipse(ctx,sunX,sunY,53,53,theme.sun);ellipse(ctx,sunX,sunY,72,72,'#fff5c326');
  for(let i=-1;i<Math.ceil(W/280)+2;i++){const drift=motion?time*3:0,x=i*310-(camera.x*.07+drift)%310;cloud(ctx,x+85,75+(i%3)*31,.6+(i%2)*.25);}
  hills(ctx,W,H,camera,theme);
  const base=Math.min(600-camera.y-43,H*.81);
  riceFields(ctx,W,base-24,camera,theme);
  // Sparse low-poly props: geometry is deliberately confined to scenery and landmarks.
  for(let i=-1;i<Math.ceil(W/690)+2;i++){
    const index=i+Math.floor(camera.x*.43/690),x=i*690-(camera.x*.43)%690+345;
    if(x < -260 || x > W+260)continue;
    const kind=worldId==='workshop'?(index%2===0?'windmill':'mill'):worldId==='wordwood'&&index%3===1?'windmill':index%2?'cottage-red':'cottage',scale=kind==='mill'?1.1:kind==='windmill'?.93:.95;
    ellipse(ctx,x+15,base+4,99*scale,9,'#445f4121');
    const yaw=.32+Math.max(-.12,Math.min(.12,(W*.5-x)/W*.2));
    drawProp(ctx,kind,{x,y:base,scale,yaw});
    if(kind==='mill'){
      const c=projectPoint([76,68,-50],yaw),spin=motion?-time*.45:.45;
      drawMesh(ctx,getProp('wheel'),{x:x+c.x*scale,y:base+c.y*scale,scale,yaw,spin});
    }
    if(kind==='windmill'){const c=projectPoint([0,105,-41],yaw);drawMesh(ctx,getProp('sails'),{x:x+c.x*scale,y:base+c.y*scale,scale,yaw,spin:motion?time*.32:.5});}
    if(worldId==='sky')drawProp(ctx,'lantern',{x:x+150,y:base+20,scale:.85,yaw});
    tree(ctx,x-165,base+20,.86,theme,index);tree(ctx,x+230,base+30,1.08,theme,index+1);
    // A wooden fence sits behind the playable path.
    ctx.fillStyle='#b4a277';for(let n=0;n<5;n++){ctx.fillRect(x+100+n*25,base+7,5,25);}
    ctx.fillStyle='#c4b78a';ctx.fillRect(x+100,base+13,104,4);ctx.fillRect(x+100,base+24,104,4);
  }
  if(motion){
    for(let i=0;i<7;i++){
      const x=((i*173+time*(8+i)-camera.x*.16)%(W+40)+W+40)%(W+40),y=H*.25+hash(i+14)*H*.42+Math.sin(time*.7+i)*7;
      ctx.fillStyle=i%2?theme.flowers:'#fff0c8';ctx.fillRect(x,y,4,2);
    }
    ctx.globalAlpha=pulse*.018;ctx.fillStyle=theme.sun;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  }
}
export function drawCountryWater(ctx,engine){
  const theme=COUNTRY_THEMES[engine.world.id],y=650;
  ctx.fillStyle=theme.water;ctx.fillRect(engine.camera.x-20,y,engine.view.w+40,170);
  ctx.fillStyle='#daeadd66';
  for(let i=Math.floor(engine.camera.x/90)-1;i<(engine.camera.x+engine.view.w)/90+1;i++){
    const drift=engine.effects?Math.sin(engine.time*.8+i)*9:0;
    ctx.fillRect(i*90+drift,y+10,44,3);ctx.fillRect(i*90+23,y+36,27,2);ctx.fillRect(i*90-5,y+68,38,2);
  }
}
export function drawCountryPlatform(ctx,p,engine){
  if(!engine.visible(p.x,p.w))return;
  const theme=COUNTRY_THEMES[engine.world.id];
  if(p.gate&&!engine.learned.has(p.gate)){
    ctx.save();ctx.strokeStyle='#806e4680';ctx.lineWidth=2;ctx.setLineDash([6,9]);ctx.strokeRect(p.x,p.y,p.w,9);ctx.restore();
    ctx.fillStyle='#8b7552';ctx.fillRect(p.x-5,p.y-25,5,28);ctx.fillRect(p.x+p.w,p.y-25,5,28);return;
  }
  if(p.type==='bridge'||p.type==='stone'){drawRaisedPlatform(ctx,p,{bridge:p.type==='bridge'});return;}
  if(p.type==='bounce'){
    ctx.fillStyle='#9a7952';ctx.fillRect(p.x+24,p.y+8,16,16);ctx.fillStyle='#cb8b73';ctx.fillRect(p.x+4,p.y+3,p.w-8,9);ctx.fillRect(p.x+11,p.y-4,p.w-22,9);
    ctx.fillStyle='#fff0c3';ctx.fillRect(p.x+16,p.y,6,4);ctx.fillRect(p.x+42,p.y,5,4);return;
  }
  ctx.fillStyle='#ad956c';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#c1a87c';ctx.fillRect(p.x,p.y+14,p.w,25);
  ctx.fillStyle=theme.grass;ctx.fillRect(p.x,p.y,p.w,9);ctx.fillStyle='#c3cf87';ctx.fillRect(p.x,p.y,p.w,3);
  const start=Math.max(p.x,Math.floor(engine.camera.x/26)*26),end=Math.min(p.x+p.w,engine.camera.x+engine.view.w+30);
  for(let x=start;x<end;x+=26){
    const r=hash(x);ctx.fillStyle='#8a785745';ctx.fillRect(x+4,p.y+43+r*45,13,6);ctx.fillRect(x+10,p.y+105+r*18,5,4);
    ctx.fillStyle=theme.grass;ctx.fillRect(x+8,p.y-4,2,7);ctx.fillRect(x+12,p.y-7,2,7);
    if(r>.73){ctx.fillStyle=theme.flowers;ctx.fillRect(x+11,p.y-11,5,5);ctx.fillStyle='#fdf4cc';ctx.fillRect(x+13,p.y-10,2,2);}
  }
}
export function drawCountryShrine(ctx,s,engine){
  if(!engine.visible(s.x-60,120))return;
  const solved=engine.learned.has(s.lessonId),y=s.y+80;
  ellipse(ctx,s.x+6,y+3,55,7,'#5a684725');
  if(solved){const gradient=ctx.createRadialGradient(s.x,y-45,4,s.x,y-45,65);gradient.addColorStop(0,'#ffda873d');gradient.addColorStop(1,'#ffdf8d00');ctx.fillStyle=gradient;ctx.fillRect(s.x-70,y-115,140,140);}
  drawProp(ctx,'shrine',{x:s.x,y,yaw:.32});
  const lesson=engine.lessonLookup(s.lessonId),label=lesson.kind==='grammar'?'文':lesson.title.slice(0,1),center=projectPoint([0,56,-22],.32);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 26px ${font}`;ctx.fillStyle='#3d584a';ctx.fillText(label,s.x+center.x,y+center.y);
  ctx.font='700 10px "Segoe UI",sans-serif';ctx.fillStyle='#3b5545';ctx.fillText(solved?'✓ DISCOVERED':'LESSON',s.x,y-129);ctx.restore();
}
export function drawCountryPortal(ctx,engine){
  const p=engine.world.portal;if(!engine.visible(p.x,p.w))return;
  const x=p.x+p.w/2,y=p.y+p.h,ready=engine.learned.size===3;
  ellipse(ctx,x+9,y+3,67,8,'#4c624229');
  if(ready){const glow=ctx.createRadialGradient(x,y-60,5,x,y-60,78);glow.addColorStop(0,'#fff3aa88');glow.addColorStop(1,'#f9eeb800');ctx.fillStyle=glow;ctx.fillRect(x-80,y-147,160,155);}
  drawProp(ctx,'gate',{x,y,yaw:.24});
  ctx.save();ctx.textAlign='center';ctx.fillStyle=ready?'#47664a':'#796e50';ctx.font=`600 28px ${font}`;ctx.fillText(ready?'次':'鍵',x,y-49);
  ctx.font='800 11px "Segoe UI",sans-serif';ctx.fillStyle='#3c5242';ctx.fillText(ready?'NEXT VILLAGE →':'3 SHRINES',x,y-145);ctx.restore();
}
