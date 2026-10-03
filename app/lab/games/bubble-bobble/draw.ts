import { BubbleBobble, WIDTH, HEIGHT, type Enemy, type Item } from "./engine";
import { pixelText } from "../pixel-text";

const C = { green:"#00ff00", blue:"#00aaff", pink:"#ff0077", yellow:"#ffff00", white:"#ffffff", gray:"#aaaadd", dark:"#11112b" };
function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) { ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h)); }
function disk(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  for(let dy=-radius;dy<=radius;dy++){const half=Math.floor(Math.sqrt(radius*radius-dy*dy));rect(ctx,color,x-half,y+dy,half*2+1,1);}
}
function ring(ctx: CanvasRenderingContext2D,x:number,y:number,r:number,color:string){
  disk(ctx,x,y,r,"#132026");
  for(let dy=-r;dy<=r;dy++){const half=Math.floor(Math.sqrt(r*r-dy*dy));rect(ctx,color,x-half,y+dy,dy===-r||dy===r?half*2+1:1,1);if(dy!==-r&&dy!==r)rect(ctx,color,x+half,y+dy,1,1);}
  rect(ctx,"#ffffff",x-r+3,y-r+3,2,1);rect(ctx,"#ffffff",x-r+2,y-r+4,1,2);
  rect(ctx,color,x+r-3,y+r-2,2,1);
}
const dragon = [
  ".....kkkkkk.....","...kkggggggkk...","..kgggggwwwwgk..","..kgggggwwkwggk.",
  ".kggggggwwkwgggk",".kgggggggggggggk","kggggggggggkkkkk","kyggggggggkppppk",
  "kygggggggggkkkk.","kyggggggwwwwgk..",".kyggggwwwwwgk..",".kygggwwwwwwgk..",
  "..kgggwwwwwggk..","...kggggggggk...","...kyykkkyyk....","....kk...kk.....",
];
function dragonSprite(ctx:CanvasRenderingContext2D,x:number,y:number,facing:number,color:string,walk:number,shoot=false){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing,1);ctx.translate(-8,-16);
  const palette:Record<string,string>={g:color,w:C.white,k:"#071b22",y:C.yellow,p:C.pink};
  dragon.forEach((line,py)=>[...line].forEach((bit,px)=>{if(bit!==".")rect(ctx,palette[bit],px,py,1,1);}));
  if(walk){rect(ctx,"#000000",3,14,10,2);rect(ctx,C.yellow,walk>0?3:5,14,4,1);rect(ctx,C.yellow,walk>0?9:8,15,4,1);}
  if(shoot){rect(ctx,C.pink,12,7,4,2);rect(ctx,C.white,13,7,3,1);}
  ctx.restore();
}
function enemySprite(ctx:CanvasRenderingContext2D,e:Pick<Enemy,"kind"|"x"|"y"|"facing"|"angry"|"vx">,time:number,forceColor?:string){
  ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(e.facing||1,1);ctx.translate(-8,-16);
  const rage=forceColor??(e.angry?"#ff4444":undefined), stride=Math.abs(e.vx)>.1?Math.sin(time*12):0;
  if(e.kind===0){
    rect(ctx,rage??C.gray,3,1,10,12);rect(ctx,rage??"#8888bb",2,3,2,10);rect(ctx,"#ffffff",10,3,4,4);rect(ctx,"#0066ff",12,4,2,3);
    rect(ctx,C.pink,10,8,4,2);rect(ctx,C.blue,3+(stride>0?1:0),13,4,3);rect(ctx,C.blue,9-(stride>0?1:0),13,4,3);rect(ctx,"#6666ff",0,6,3,3);rect(ctx,"#6666ff",0,4,1,5);
  }else if(e.kind===1){
    disk(ctx,8,6,6,rage??C.white);rect(ctx,rage??C.white,2,6,12,8);rect(ctx,C.pink,9,5,6,4);rect(ctx,"#333333",10,5,1,1);rect(ctx,"#333333",13,5,1,1);rect(ctx,C.white,1,13,4,3);rect(ctx,C.white,11,13,4,3);
    rect(ctx,"#8888bb",3,11,1,3);rect(ctx,"#8888bb",6,12,1,3);rect(ctx,"#00aaff",4,14,3,2);
  }else if(e.kind===2){
    disk(ctx,8,8,7,rage??"#8800ff");rect(ctx,rage??"#8800ff",0,1,3,4);rect(ctx,rage??"#8800ff",13,1,3,4);rect(ctx,C.white,5,5,3,4);rect(ctx,C.white,10,5,3,4);rect(ctx,C.pink,6,6,1,2);rect(ctx,C.pink,11,6,1,2);rect(ctx,C.pink,4,11,10,2);rect(ctx,C.white,6,11,2,1);rect(ctx,C.white,10,11,2,1);
  }else if(e.kind===3){
    rect(ctx,"#8800ff",1,1,14,1);rect(ctx,C.yellow,Math.floor(time*20)%2?1:4,0,8,1);disk(ctx,8,8,6,rage??"#ffaaaa");rect(ctx,C.yellow,1,6,3,4);rect(ctx,C.yellow,12,6,3,4);rect(ctx,C.white,9,5,4,3);rect(ctx,"#8800ff",12,6,1,2);rect(ctx,"#8800ff",5,12,2,3);rect(ctx,"#8800ff",10,12,2,3);
  }else if(e.kind===4){
    disk(ctx,8,5,6,rage??"#ff8800");rect(ctx,C.white,9,3,3,3);rect(ctx,"#8800ff",11,4,1,2);rect(ctx,C.pink,11,7,4,1);
    for(let y=10;y<15;y+=2){rect(ctx,"#ddddff",4,y,8,1);rect(ctx,"#8888bb",y%4?4:10,y+1,2,1);}rect(ctx,"#ff8800",2,15,5,1);rect(ctx,"#ff8800",9,15,5,1);
  }else if(e.kind===5){
    disk(ctx,8,7,6,rage??"#008800");rect(ctx,"#00dd00",5,1,5,4);rect(ctx,C.white,9,4,4,3);rect(ctx,"#111111",12,4,1,2);rect(ctx,"#ffaa88",10,8,6,4);rect(ctx,C.pink,12,9,4,1);rect(ctx,"#00dd00",4,13,4,2);rect(ctx,"#00dd00",10,13,4,2);
  }else if(e.kind===6){
    rect(ctx,rage??C.gray,6,0,4,3);rect(ctx,rage??C.gray,4,3,9,3);rect(ctx,rage??C.gray,2,6,12,7);rect(ctx,C.pink,9,6,6,4);rect(ctx,C.white,10,5,3,2);rect(ctx,"#222244",12,5,1,1);rect(ctx,"#8888bb",3,13,4,3);rect(ctx,"#8888bb",9,13,4,3);rect(ctx,C.yellow,14,9,1,7);
  }else{
    for(let y=1;y<9;y++)rect(ctx,rage??C.gray,8-Math.floor(y/2),y,Math.floor(y/2)*2+1,1);
    rect(ctx,rage??C.gray,1,7,14,5);rect(ctx,C.pink,4,9,8,2);rect(ctx,"#111122",5,6,2,2);rect(ctx,"#111122",10,6,2,2);rect(ctx,"#8888bb",2,12,3,3);rect(ctx,"#8888bb",7,12,2,4);rect(ctx,"#8888bb",11,12,3,3);
  }
  ctx.restore();
}
function fruit(ctx:CanvasRenderingContext2D,x:number,y:number,index:number){
  const i=index%8;
  if(i===0){rect(ctx,C.yellow,x-4,y-1,2,4);rect(ctx,C.yellow,x-2,y+2,6,2);rect(ctx,"#ffaa00",x-2,y+4,4,1);rect(ctx,"#668800",x-4,y-2,1,2);}
  else if(i===1){disk(ctx,x-2,y+1,3,"#ff3344");disk(ctx,x+2,y+1,3,"#ff0077");rect(ctx,"#00ff00",x,y-5,3,2);rect(ctx,C.white,x-3,y-1,1,1);}
  else if(i===2){disk(ctx,x,y,5,"#ff8800");rect(ctx,"#ffff00",x-2,y-2,2,1);rect(ctx,"#008800",x,y-6,3,2);}
  else if(i===3){rect(ctx,"#ffff00",x-3,y-3,6,8);for(let py=-3;py<5;py+=2)for(let px=-3;px<3;px+=2)rect(ctx,"#cc8800",x+px,y+py,1,1);rect(ctx,"#00ff00",x-1,y-7,2,4);rect(ctx,"#00ff00",x-4,y-6,8,1);}
  else if(i===4){for(const[dx,dy]of[[0,-3],[-2,0],[2,0],[-1,3]])disk(ctx,x+dx,y+dy,2,"#8800ff");rect(ctx,"#00ff00",x,y-6,2,2);}
  else if(i===5){for(let dy=0;dy<7;dy++)rect(ctx,dy<5?"#ff0077":"#00ff00",x-4+Math.floor(dy/2),y-4+dy,9-dy,1);rect(ctx,"#000000",x,y-2,1,1);rect(ctx,"#000000",x-2,y,1,1);}
  else if(i===6){rect(ctx,C.white,x-5,y-2,10,7);rect(ctx,C.pink,x-5,y+1,10,2);rect(ctx,C.yellow,x-4,y+5,8,1);rect(ctx,C.pink,x,y-5,2,3);}
  else{disk(ctx,x,y-2,4,"#ddddff");for(let dy=2;dy<7;dy++)rect(ctx,"#ffaa00",x-3+Math.floor((dy-2)/2),y+dy,6-(dy-2),1);}
}
function drawItem(ctx:CanvasRenderingContext2D,item:Item,time:number){
  const x=Math.round(item.x),y=Math.round(item.y);if(item.life<3&&Math.floor(time*8)%2)return;
  if(item.kind==="fruit"){fruit(ctx,x,y,item.fruit);return;}
  if(item.kind==="diamond"){for(let dy=-5;dy<=5;dy++){const half=5-Math.abs(dy);rect(ctx,dy<0?"#00ffff":"#00aaff",x-half,y+dy,half*2+1,1);}rect(ctx,C.white,x-2,y-3,3,1);}
  else if(item.kind==="shoe"){rect(ctx,"#ff3344",x-3,y-4,4,6);rect(ctx,"#ff3344",x-4,y+1,9,3);rect(ctx,C.yellow,x-4,y+4,9,1);rect(ctx,C.white,x-2,y-2,2,1);}
  else if(["yellow","purple","blue"].includes(item.kind)){const color=item.kind==="yellow"?C.yellow:item.kind==="blue"?C.blue:"#8800ff";rect(ctx,color,x-3,y-3,6,6);rect(ctx,color,x-6,y-2,2,5);rect(ctx,color,x+4,y-2,2,5);rect(ctx,C.white,x-2,y-2,2,4);}
  else if(item.kind==="heart"){disk(ctx,x-2,y-2,3,C.pink);disk(ctx,x+2,y-2,3,C.pink);for(let dy=0;dy<5;dy++)rect(ctx,C.pink,x-4+dy,y+dy,9-dy*2,1);rect(ctx,C.white,x-3,y-3,2,1);}
  else if(item.kind==="bomb"){disk(ctx,x,y+1,4,"#8888bb");disk(ctx,x+1,y+2,3,"#111144");rect(ctx,C.yellow,x,y-5,2,3);rect(ctx,C.pink,x+2,y-6,2,2);}
  else if(item.kind==="clock"){disk(ctx,x,y,5,C.yellow);disk(ctx,x,y,4,C.white);rect(ctx,"#333333",x,y-3,1,4);rect(ctx,"#333333",x,y,3,1);}
  else if(item.kind.startsWith("umbrella")){const color=item.kind==="umbrella3"?C.blue:item.kind==="umbrella5"?C.yellow:"#8800ff";for(let dy=0;dy<5;dy++)rect(ctx,color,x-dy,y-5+dy,dy*2+1,1);rect(ctx,C.white,x,y,1,6);rect(ctx,C.white,x-2,y+5,2,1);}
  else if(item.kind==="potion"){rect(ctx,C.yellow,x-2,y-6,4,2);rect(ctx,"#00ffff",x-2,y-4,4,3);rect(ctx,C.yellow,x-4,y-1,8,6);rect(ctx,C.pink,x-2,y+1,4,2);}
  else if(item.kind==="door"){rect(ctx,"#ffff00",x-7,y-12,14,19);rect(ctx,"#6666ff",x-5,y-10,10,17);rect(ctx,"#000033",x-3,y-8,6,15);rect(ctx,C.white,x-5,y-11,10,1);}
}
function tiles(ctx:CanvasRenderingContext2D,g:BubbleBobble){
  const colors=g.colors,main=colors[0],shade=colors[1];
  for(let y=1;y<28;y++)for(let x=0;x<32;x++)if(g.tiles[y]?.[x]){
    rect(ctx,shade,x*8,y*8,8,8);rect(ctx,main,x*8,y*8,8,1);rect(ctx,main,x*8,y*8,1,8);
    const pattern=g.round%5;
    if(pattern===0){for(let d=-6;d<8;d+=4)for(let py=0;py<8;py++){const px=d+py;if(px>=0&&px<8)rect(ctx,main,x*8+px,y*8+py,1,1);}}
    else if(pattern===1){rect(ctx,main,x*8+2,y*8+2,4,4);rect(ctx,shade,x*8+3,y*8+3,2,2);}
    else if(pattern===2){for(let py=1;py<8;py+=2)for(let px=1;px<8;px+=2)rect(ctx,main,x*8+px,y*8+py,1,1);}
    else if(pattern===3){rect(ctx,main,x*8+2,y*8+2,4,1);rect(ctx,main,x*8+2,y*8+3,1,3);rect(ctx,"#111122",x*8+7,y*8+7,1,1);}
    else{for(let py=0;py<8;py+=2)rect(ctx,main,x*8,y*8+py,8,1);}
  }
}
function boss(ctx:CanvasRenderingContext2D,g:BubbleBobble){
  const b=g.boss;if(!b||b.state==="dead")return;
  ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));
  if(b.state==="trapped")ring(ctx,0,0,26,C.green);
  const color=b.hp<=20&&Math.floor(g.time*5)%2?"#ff4444":"#00bb00";
  disk(ctx,0,-5,22,color);rect(ctx,color,-18,-28,28,12);rect(ctx,"#008800",-20,-10,4,24);
  disk(ctx,5,7,17,"#ff7777");rect(ctx,"#ff0077",4,3,19,5);rect(ctx,"#ffaaaa",11,10,9,8);
  disk(ctx,2,-15,11,C.white);rect(ctx,"#111122",-3,-24,4,17);rect(ctx,"#111122",5,-24,4,17);
  rect(ctx,C.yellow,17,-12,8,2);rect(ctx,C.yellow,21,-14,2,7);
  rect(ctx,C.pink,-19,18,13,6);rect(ctx,C.pink,7,18,13,6);ctx.restore();
  if(b.state==="fighting"){rect(ctx,"#330033",79,20,98,3);rect(ctx,C.pink,80,20,96*b.hp/b.maxHp,3);}
}
function hud(ctx:CanvasRenderingContext2D,g:BubbleBobble){
  rect(ctx,"#000000",0,0,WIDTH,16);
  pixelText(ctx,"1UP",4,0,C.green);pixelText(ctx,String(g.players[0]?.score??0).padStart(7,"0"),4,8,C.white);
  pixelText(ctx,"HI SCORE",128,0,C.pink,1,true);pixelText(ctx,String(g.best).padStart(7,"0"),128,8,C.white,1,true);
  pixelText(ctx,"2UP",212,0,C.blue);pixelText(ctx,g.players[1]?String(g.players[1].score).padStart(7,"0"):"JOIN 2P",209,8,g.players[1]?C.white:"#8888bb");
  for(const p of g.players){const x=p.id?194:16;for(let i=0;i<Math.min(p.lives,5);i++){rect(ctx,p.id?C.blue:C.green,x+i*8,216,5,5);rect(ctx,C.white,x+i*8+3,217,2,2);}if(p.lives>5)pixelText(ctx,String(p.lives),x+43,216,p.id?C.blue:C.green);}
  pixelText(ctx,String(g.round+1).padStart(2,"0"),128,215,C.white,1,true);
  for(const p of g.players)for(let i=0;i<6;i++)pixelText(ctx,"EXTEND"[i],(p.id?201:17)+i*6,205,p.extend[i]?(p.id?C.blue:C.green):"#555566");
}
export function drawBubbleBobble(ctx:CanvasRenderingContext2D,g:BubbleBobble){
  ctx.imageSmoothingEnabled=false;rect(ctx,"#000000",0,0,WIDTH,HEIGHT);
  ctx.save();ctx.beginPath();ctx.rect(0,16,WIDTH,HEIGHT-16);ctx.clip();tiles(ctx,g);
  if(g.bonus)pixelText(ctx,"SECRET ROOM",128,30,C.yellow,1,true);
  for(const item of g.items)drawItem(ctx,item,g.time);
  for(const e of g.enemies)if(e.state==="free")enemySprite(ctx,{...e,angry:e.angry||g.hurry||g.remaining===1},g.time);
  for(const b of g.bubbles){
    const color=b.life<2&&b.kind==="enemy"?C.pink:b.owner===1?C.blue:C.green;
    ring(ctx,b.x,b.y,b.radius,b.kind==="water"?"#00ffff":b.kind==="fire"?C.pink:b.kind==="thunder"?C.yellow:color);
    if(b.kind==="enemy"){const e=g.enemies.find(e=>e.id===b.enemy);if(e){ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y+6));ctx.scale(.7,.7);enemySprite(ctx,{...e,x:0,y:0,vx:0},g.time);ctx.restore();}}
    else if(b.kind==="letter")pixelText(ctx,"EXTEND"[b.letter],b.x,b.y-3,C.yellow,1,true);
    else if(b.kind==="thunder"){rect(ctx,C.yellow,b.x+1,b.y-4,2,4);rect(ctx,C.yellow,b.x-2,b.y-1,4,2);rect(ctx,C.yellow,b.x-2,b.y+1,2,4);}
    else if(b.kind==="water"){rect(ctx,"#00ffff",b.x-3,b.y-1,6,4);rect(ctx,C.white,b.x-1,b.y-4,2,3);}
    else if(b.kind==="fire"){rect(ctx,C.pink,b.x-2,b.y-4,4,7);rect(ctx,C.yellow,b.x,b.y,2,4);}
  }
  boss(ctx,g);
  for(const s of g.shots){
    if(s.kind==="thunder"){for(let i=-5;i<6;i++)rect(ctx,C.yellow,s.x+i,s.y+(i%3),2,1);}
    else if(s.kind==="water"){rect(ctx,"#00aaff",s.x-8,s.y-3,16,6);rect(ctx,"#00ffff",s.x-7,s.y-4,12,1);}
    else if(s.kind==="flame"||s.kind==="fire"){disk(ctx,s.x,s.y,3,C.pink);rect(ctx,C.yellow,s.x-1,s.y-2,2,3);}
    else if(s.kind==="laser")rect(ctx,C.pink,s.x,s.y-4,1,8);
    else if(s.kind==="bottle"){rect(ctx,C.blue,s.x-2,s.y-3,4,6);rect(ctx,C.white,s.x-1,s.y-4,2,2);}
    else disk(ctx,s.x,s.y,3,"#bbbbcc");
  }
  for(const p of g.players)if(p.alive){
    ctx.save();if(p.invincible>0&&Math.floor(g.time*12)%2)ctx.globalAlpha=.5;
    dragonSprite(ctx,p.x,p.y,p.facing,p.id?C.blue:C.green,p.grounded&&p.vx?Math.sin(g.time*18):0,p.shooting>0);ctx.restore();
  }
  if(!g.players.length)for(const[id,x]of[[0,32],[1,224]])dragonSprite(ctx,x,200,id?-1:1,id?C.blue:C.green,0);
  for(const s of g.skels){disk(ctx,s.x,s.y,8,C.white);rect(ctx,C.pink,s.x-4,s.y-2,3,3);rect(ctx,C.pink,s.x+1,s.y-2,3,3);rect(ctx,"#111111",s.x-2,s.y+3,4,2);rect(ctx,C.white,s.x-9,s.y-6,4,3);rect(ctx,C.white,s.x+5,s.y-6,4,3);}
  for(const p of g.particles){if(p.text)pixelText(ctx,p.text,p.x,p.y,p.color,1,true);else rect(ctx,p.color,p.x,p.y,2,2);}
  if(g.hurry&&g.roundTime<38&&g.mode==="playing")pixelText(ctx,"HURRY UP",128,104,C.pink,2,true);
  if(g.mode==="clear"){rect(ctx,"#000000",42,80,172,33);pixelText(ctx,"ROUND CLEAR",128,86,C.yellow,2,true);pixelText(ctx,"COLLECT THE BONUSES",128,104,C.white,1,true);}
  ctx.restore();hud(ctx,g);
  if(["ready","paused","over","won"].includes(g.mode)){
    ctx.fillStyle="rgba(0,0,0,.83)";ctx.fillRect(20,28,216,165);
    if(g.mode==="ready"){
      for(const[x,y,r]of[[64,64,16],[84,49,17],[105,45,16],[130,47,18],[153,46,17],[179,51,18],[193,72,16],[178,91,17],[153,98,16],[127,96,16],[103,96,18],[80,91,16],[66,81,18]])disk(ctx,x,y,r,C.yellow);
      pixelText(ctx,"BUBBLE",129,53,"#008877",3,true);pixelText(ctx,"BUBBLE",127,51,C.pink,3,true);
      pixelText(ctx,"BOBBLE",129,78,"#008877",3,true);pixelText(ctx,"BOBBLE",127,76,C.pink,3,true);
      pixelText(ctx,g.superMode?"SUPER BUBBLE BOBBLE":"100 ROUNDS",128,108,C.white,1,true);
    }else if(g.mode==="paused")pixelText(ctx,"PAUSED",128,69,C.yellow,2,true);
    else if(g.mode==="over")pixelText(ctx,"GAME OVER",128,56,C.pink,2,true);
    else{pixelText(ctx,g.ending==="solo"?"TRY WITH A FRIEND":"HAPPY END",128,51,C.yellow,g.ending==="solo"?1:2,true);pixelText(ctx,g.ending==="true"?"THE WHOLE FAMILY IS SAFE":g.ending==="together"?"BUB AND BOB TOGETHER":"THE ADVENTURE CONTINUES",128,78,C.white,1,true);dragonSprite(ctx,94,108,1,C.green,0);dragonSprite(ctx,162,108,-1,C.blue,0);}
    pixelText(ctx,"BEST "+g.best,128,196,C.white,1,true);
  }
}
