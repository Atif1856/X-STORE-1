/* X STORE — premium motion controller v3 (no commerce logic) */
(()=>{"use strict";
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const progress=document.createElement("div");progress.id="xs-progress";document.body.appendChild(progress);
const topButton=document.createElement("button");topButton.id="xs-back-top";topButton.type="button";topButton.setAttribute("aria-label","Back to top");topButton.innerHTML="↑";document.body.appendChild(topButton);

/* Full-screen dot field; remains visible even with reduced-motion enabled. */
{
 const canvas=document.createElement("canvas");
 canvas.id="xs-dot-field";
 canvas.setAttribute("aria-hidden","true");
 Object.assign(canvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"999",opacity:"1"});
 document.body.appendChild(canvas);
 const ctx=canvas.getContext("2d");
 let w=0,h=0,dpr=1,points=[],raf=0;
 const pointer={x:-1000,y:-1000,tx:-1000,ty:-1000};
 function resize(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const gap=w<600?24:28;points=[];
  for(let y=gap/2;y<h+gap;y+=gap)for(let x=gap/2;x<w+gap;x+=gap)
   points.push({x,y,ox:x,oy:y,vx:0,vy:0});
 }
 function draw(){
  pointer.x+=(pointer.tx-pointer.x)*.16;pointer.y+=(pointer.ty-pointer.y)*.16;
  ctx.clearRect(0,0,w,h);
  for(const p of points){
   const dx=p.x-pointer.x,dy=p.y-pointer.y,dist=Math.hypot(dx,dy)||1;
   const radius=145,force=Math.max(0,1-dist/radius);
   const push=force*24;
   const tx=p.ox+(dx/dist)*push,ty=p.oy+(dy/dist)*push;
   p.vx+=(tx-p.x)*.13;p.vy+=(ty-p.y)*.13;
   p.vx*=.78;p.vy*=.78;p.x+=p.vx;p.y+=p.vy;
   const alpha=.28+force*.62;
   ctx.beginPath();ctx.arc(p.x,p.y,1.45+force*.8,0,Math.PI*2);
   ctx.fillStyle="rgba(38,53,43,"+Math.min(alpha,.95)+")";ctx.fill();
  }
  raf=requestAnimationFrame(draw);
 }
 window.addEventListener("pointermove",e=>{pointer.tx=e.clientX;pointer.ty=e.clientY;},{passive:true});
 window.addEventListener("pointerleave",()=>{pointer.tx=-1000;pointer.ty=-1000;},{passive:true});
 window.addEventListener("resize",resize,{passive:true});
 resize();draw();
 document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!raf){draw();}});
}


/* X STORE branded intro: once per browser tab session. */
let showIntro=false;
try{showIntro=!sessionStorage.getItem("xs-intro-seen");if(showIntro)sessionStorage.setItem("xs-intro-seen","1");}catch(e){showIntro=false;}
if(showIntro){
 const intro=document.createElement("div");intro.id="xs-brand-intro";
 Object.assign(intro.style,{position:"fixed",inset:"0",zIndex:"10000",display:"grid",placeItems:"center",background:"#EEF0E7",opacity:"1",transition:"opacity .55s ease",pointerEvents:"auto"});
 intro.innerHTML='<div style="display:grid;justify-items:center;gap:14px;color:#26352B;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.32em"><img src="xstore-mark.svg" alt="" style="width:74px;height:74px;object-fit:contain;animation:xsLogoPop .8s cubic-bezier(.2,.8,.2,1) both"><span>X STORE</span><i style="display:block;width:46px;height:2px;background:#A6A17A;transform-origin:left;animation:xsLoaderLine 1.15s ease both"></i></div>';
 document.body.appendChild(intro);
 const introStyle=document.createElement("style");
 introStyle.textContent="@keyframes xsLogoPop{from{opacity:0;transform:translateY(12px) scale(.88)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes xsLoaderLine{from{transform:scaleX(0)}to{transform:scaleX(1)}}";
 document.head.appendChild(introStyle);
 window.setTimeout(()=>{intro.style.opacity="0";window.setTimeout(()=>intro.remove(),600);},1100);
}

/* Moving announcement ribbon on the home page. */
if(location.pathname.endsWith("/")||location.pathname.endsWith("/index.html")){
 const ribbon=document.createElement("div");ribbon.className="xs-marquee";ribbon.setAttribute("aria-label","X STORE shopping highlights");
 ribbon.innerHTML='<div class="xs-marquee-track"><span>CURATED FINDS</span><b>✦</b><span>CASH ON DELIVERY</span><b>✦</b><span>SHOP THE EVERYDAY</span><b>✦</b><span>CURATED FINDS</span><b>✦</b><span>CASH ON DELIVERY</span><b>✦</b><span>SHOP THE EVERYDAY</span><b>✦</b></div>';
 const headerEl=$(".site-header");
 if(headerEl)headerEl.insertAdjacentElement("afterend",ribbon);
 const ribbonStyle=document.createElement("style");
 ribbonStyle.textContent=".xs-marquee{position:relative;z-index:4;overflow:hidden;background:#26352B;color:#EEF0E7;padding:12px 0;border-bottom:1px solid rgba(166,161,122,.35)}.xs-marquee-track{display:flex;align-items:center;justify-content:space-around;gap:34px;width:max-content;min-width:200%;white-space:nowrap;animation:xsMarqueeRun 32s linear infinite;font:600 10px/1.4 Arial,sans-serif;letter-spacing:.2em}.xs-marquee-track b{color:#A6A17A;font-size:13px}@keyframes xsMarqueeRun{to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.xs-marquee-track{animation:none;min-width:100%;justify-content:center;flex-wrap:wrap;white-space:normal}}";
 document.head.appendChild(ribbonStyle);
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

/* Premium interactions: cursor spotlight, 3D product tilt and ambient olive wash. */
if(!reduce && window.matchMedia("(pointer:fine)").matches){
 const spotlight=document.createElement("div");
 spotlight.id="xs-cursor-spotlight";
 Object.assign(spotlight.style,{position:"fixed",inset:"0",pointerEvents:"none",zIndex:"2",opacity:"0",background:"radial-gradient(380px circle at var(--mx,50%) var(--my,50%), rgba(166,161,122,.16), transparent 72%)",transition:"opacity .35s ease"});
 document.body.appendChild(spotlight);
 window.addEventListener("pointermove",e=>{
  spotlight.style.setProperty("--mx",e.clientX+"px");
  spotlight.style.setProperty("--my",e.clientY+"px");
  spotlight.style.opacity="1";
 },{passive:true});
 document.addEventListener("pointerleave",()=>{spotlight.style.opacity="0";});
}

/* Ambient olive light — very slow movement, no layout or click impact. */
const ambient=document.createElement("div");
ambient.id="xs-ambient-wash";
Object.assign(ambient.style,{position:"fixed",inset:"-20%",pointerEvents:"none",zIndex:"1",opacity:".32",background:"radial-gradient(ellipse at 18% 22%, rgba(166,161,122,.17), transparent 42%), radial-gradient(ellipse at 82% 76%, rgba(82,107,80,.12), transparent 44%)",animation:reduce?"none":"xsAmbientDrift 24s ease-in-out infinite alternate"});
document.body.appendChild(ambient);
const motionStyle=document.createElement("style");
motionStyle.textContent="@keyframes xsAmbientDrift{from{transform:translate3d(-1.5%, -1%, 0) scale(1)}to{transform:translate3d(1.5%, 1%, 0) scale(1.04)}}"+
"@media(pointer:fine) and (prefers-reduced-motion:no-preference){.product-card{transform-style:preserve-3d;will-change:transform;transition:transform .22s ease,box-shadow .22s ease}.product-card.xs-tilt-active{box-shadow:0 18px 38px rgba(38,53,43,.13)}.product-card.xs-tilt-active .product-image img{transform:translateZ(18px) scale(1.045)}}"+
"@media(prefers-reduced-motion:reduce){#xs-ambient-wash{animation:none!important}}";
document.head.appendChild(motionStyle);

if(!reduce && window.matchMedia("(pointer:fine)").matches){
 const cards=new WeakSet();
 function enableTilt(root=document){
  $(".product-card",root).forEach(card=>{
   if(cards.has(card))return;cards.add(card);
   card.addEventListener("pointermove",e=>{
    const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    card.classList.add("xs-tilt-active");
    card.style.transform="perspective(900px) rotateX("+((.5-y)*5)+"deg) rotateY("+((x-.5)*6)+"deg) translateY(-3px)";
   },{passive:true});
   const reset=()=>{card.classList.remove("xs-tilt-active");card.style.transform="";};
   card.addEventListener("pointerleave",reset,{passive:true});
   card.addEventListener("pointercancel",reset,{passive:true});
  });
 }
 enableTilt();
 const productGrid=$("#product-grid");
 if(productGrid)new MutationObserver(()=>enableTilt(productGrid)).observe(productGrid,{childList:true,subtree:true});
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