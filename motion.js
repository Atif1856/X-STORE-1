/* X STORE — premium motion controller v3 (no commerce logic) */
(()=>{"use strict";
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const progress=document.createElement("div");progress.id="xs-progress";document.body.appendChild(progress);
const topButton=document.createElement("button");topButton.id="xs-back-top";topButton.type="button";topButton.setAttribute("aria-label","Back to top");topButton.innerHTML="↑";document.body.appendChild(topButton);

/* Subtle full-screen dot field that reacts to pointer movement. */
if(!reduce){
 const canvas=document.createElement("canvas");
 canvas.id="xs-dot-field";
 canvas.setAttribute("aria-hidden","true");
 Object.assign(canvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"8",opacity:".52"});
 document.body.appendChild(canvas);
 const ctx=canvas.getContext("2d");
 let w=0,h=0,dpr=1,points=[],raf=0;
 const pointer={x:-1000,y:-1000,tx:-1000,ty:-1000};
 function resize(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const gap=w<600?27:32;points=[];
  for(let y=gap/2;y<h+gap;y+=gap)for(let x=gap/2;x<w+gap;x+=gap)
   points.push({x,y,ox:x,oy:y,vx:0,vy:0});
 }
 function draw(){
  pointer.x+=(pointer.tx-pointer.x)*.16;pointer.y+=(pointer.ty-pointer.y)*.16;
  ctx.clearRect(0,0,w,h);
  for(const p of points){
   const dx=p.x-pointer.x,dy=p.y-pointer.y,dist=Math.hypot(dx,dy)||1;
   const radius=112,force=Math.max(0,1-dist/radius);
   const push=force*13;
   const tx=p.ox+(dx/dist)*push,ty=p.oy+(dy/dist)*push;
   p.vx+=(tx-p.x)*.13;p.vy+=(ty-p.y)*.13;
   p.vx*=.78;p.vy*=.78;p.x+=p.vx;p.y+=p.vy;
   const alpha=.16+force*.42;
   ctx.beginPath();ctx.arc(p.x,p.y,1.05+force*.35,0,Math.PI*2);
   ctx.fillStyle="rgba(38,53,43,"+alpha+")";ctx.fill();
  }
  raf=requestAnimationFrame(draw);
 }
 window.addEventListener("pointermove",e=>{pointer.tx=e.clientX;pointer.ty=e.clientY;},{passive:true});
 window.addEventListener("pointerleave",()=>{pointer.tx=-1000;pointer.ty=-1000;},{passive:true});
 window.addEventListener("resize",resize,{passive:true});
 resize();draw();
 document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(raf);}else if(!raf)draw();});
}

const header=$(".site-header");
let scrollTick=false;
function updateScrollUI(){
 const doc=document.documentElement;
 const max=doc.scrollHeight-window.innerHeight;
 progress.style.width=(max>0?Math.min(100,window.scrollY/max*100):0)+"%";
 if(header)header.classList.toggle("xs-scrolled",window.scrollY>18);
 topButton.classList.toggle("xs-show",window.scrollY>480);
 scrollTick=false;
}
window.addEventListener("scroll",()=>{if(!scrollTick){requestAnimationFrame(updateScrollUI);scrollTick=true;}},{passive:true});
window.addEventListener("resize",updateScrollUI,{passive:true});
topButton.addEventListener("click",()=>window.scrollTo({top:0,behavior:reduce?"auto":"smooth"}));
updateScrollUI();
if(!reduce&&"IntersectionObserver"in window){
 const selector="main section,main article,main .panel,main .about-cta,main .contact-strip,main .editorial,main .product-card,main .value-card,main .tracking-card,main .success-panel";
 const seen=new WeakSet();
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("xs-visible");observer.unobserve(entry.target);}}),{threshold:.08,rootMargin:"0px 0px -45px 0px"});
 function reveal(root=document){
  $$(selector,root).forEach((el,i)=>{
   if(seen.has(el)||el.closest("header,footer"))return;
   seen.add(el);el.classList.add("xs-reveal");
   if(el.matches(".hero-copy"))el.classList.add("xs-reveal-left");
   else if(el.matches(".hero-art"))el.classList.add("xs-reveal-right");
   else if(el.matches(".product-card,.value-card"))el.classList.add("xs-reveal-scale");
   else el.classList.add("xs-delay-"+((i%4)+1));
   observer.observe(el);
  });
 }
 reveal();
 const grid=$("#product-grid");
 if(grid)new MutationObserver(()=>reveal(grid)).observe(grid,{childList:true,subtree:true});
}else{
 $$(".xs-reveal").forEach(el=>el.classList.add("xs-visible"));
}
document.addEventListener("click",event=>{
 const a=event.target.closest("a[href]");
 if(!a||reduce||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==="_blank"||a.hasAttribute("download"))return;
 const href=a.getAttribute("href");
 if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
 let url;try{url=new URL(a.href,location.href)}catch{return}
 if(url.origin!==location.origin||url.pathname===location.pathname&&url.search===location.search)return;
 event.preventDefault();document.body.classList.add("xs-page-leaving");
 window.setTimeout(()=>{location.href=url.href},170);
});
})();