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


/* X STORE full-screen split curtain intro */
let showIntro=true;
if(showIntro){
 const intro=document.createElement("div");
 intro.id="xs-brand-intro";
 Object.assign(intro.style,{position:"fixed",inset:"0",zIndex:"10000",display:"grid",placeItems:"center",background:"#EEF0E7",pointerEvents:"auto",overflow:"hidden"});
 intro.innerHTML='<div style="display:grid;justify-items:center;gap:14px;color:#26352B;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.32em"><img src="xstore-mark.svg" alt="" style="width:74px;height:74px;object-fit:contain;animation:xsLogoPop .8s cubic-bezier(.2,.8,.2,1) both"><span style="opacity:0;animation:xsBrandText .65s ease .25s forwards;letter-spacing:.42em">X STORE</span><i style="display:block;width:46px;height:2px;background:#A6A17A;transform-origin:left;animation:xsLoaderLine 1.15s ease both"></i></div>';
 document.body.appendChild(intro);
 const introStyle=document.createElement("style");
 introStyle.textContent="@keyframes xsLogoPop{from{opacity:0;transform:translateY(12px) scale(.88)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes xsLoaderLine{from{transform:scaleX(0);opacity:.3}to{transform:scaleX(1);opacity:1}}@keyframes xsBrandText{from{opacity:0;transform:translateY(8px);letter-spacing:.65em}to{opacity:1;transform:translateY(0);letter-spacing:.42em}}#xs-brand-intro.xs-curtain-stage{display:block!important;background:transparent!important}#xs-brand-intro .xs-curtain-panel{position:absolute;left:0;width:100%;height:50.1%;background:#EEF0E7;transform:translateY(0);transition:transform 1.15s cubic-bezier(.76,0,.24,1);will-change:transform}#xs-brand-intro .xs-curtain-top{top:0}#xs-brand-intro .xs-curtain-bottom{bottom:0}#xs-brand-intro.xs-curtain-open .xs-curtain-top{transform:translateY(-101%)}#xs-brand-intro.xs-curtain-open .xs-curtain-bottom{transform:translateY(101%)}";
 document.head.appendChild(introStyle);
 window.setTimeout(()=>{
  intro.innerHTML='<div class="xs-curtain-panel xs-curtain-top"></div><div class="xs-curtain-panel xs-curtain-bottom"></div>';
  intro.classList.add("xs-curtain-stage");
  void intro.offsetHeight;
  requestAnimationFrame(()=>requestAnimationFrame(()=>intro.classList.add("xs-curtain-open")));
  window.setTimeout(()=>intro.remove(),1250);
 },2000);
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
  $(selector,root).forEach((el,i)=>{
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
 $(".xs-reveal").forEach(el=>el.classList.add("xs-visible"));
}

/* Selected premium motions: image reveal, refined page transitions, counters, cart feedback. */
if(!reduce){
 const motionCSS=document.createElement("style");
 motionCSS.textContent=
  ".product-card .product-image img{clip-path:inset(7% 5% 7% 5%);opacity:.72;transition:clip-path .85s cubic-bezier(.22,.72,.18,1),opacity .7s ease,transform .35s ease}"+
  ".product-card.xs-visible .product-image img{clip-path:inset(0);opacity:1}"+
  "body:after{content:'';position:fixed;inset:0;z-index:10001;pointer-events:none;background:#26352B;transform:scaleY(0);transform-origin:bottom;transition:transform .32s cubic-bezier(.7,0,.2,1)}"+
  "body.xs-page-leaving:after{transform:scaleY(1);transform-origin:bottom}"+
  ".cart-link .count.xs-cart-bump{animation:xsCartBump .48s cubic-bezier(.2,.8,.2,1)}"+
  "@keyframes xsCartBump{0%{transform:scale(1)}35%{transform:scale(1.42) rotate(-7deg)}70%{transform:scale(.9)}100%{transform:scale(1)}}"+
  ".xs-counter-running{font-variant-numeric:tabular-nums}";
 document.head.appendChild(motionCSS);

 // Animate numeric dashboard values when they enter view, including values loaded later.
 const counterSeen=new WeakMap();
 const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const el=entry.target;counterObserver.unobserve(el);
  const raw=(el.textContent||"").trim();
  const match=raw.match(/^(\\D*?)([\\d,]+(?:\\.\\d+)?)(\\D*)$/);
  if(!match)return;
  const target=Number(match[2].replace(/,/g,""));
  if(!Number.isFinite(target)||target===0)return;
  const previous=counterSeen.get(el);if(previous===raw)return;counterSeen.set(el,raw);
  const prefix=match[1],suffix=match[3],start=performance.now(),duration=850;
  el.classList.add("xs-counter-running");
  function tick(now){
   const t=Math.min(1,(now-start)/duration), eased=1-Math.pow(1-t,3);
   const value=target*eased;
   const decimals=match[2].includes(".")?match[2].split(".")[1].length:0;
   el.textContent=prefix+value.toLocaleString("en-PK",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+suffix;
   if(t<1)requestAnimationFrame(tick);else el.textContent=raw;
  }
  requestAnimationFrame(tick);
 }));
 function watchCounters(root=document){
  $$(".stat-card strong,.analytics-card strong",root).forEach(el=>{
   if(el.dataset.xsCounterObserved)return;
   el.dataset.xsCounterObserved="1";counterObserver.observe(el);
  });
 }
 watchCounters();
 const counterMutation=new MutationObserver(()=>watchCounters());
 counterMutation.observe(document.body,{childList:true,subtree:true,characterData:true});

 // Give the cart count a quick, subtle bounce whenever its value changes.
 const cartCount=$("#cart-count");
 if(cartCount){
  let last=cartCount.textContent;
  new MutationObserver(()=>{
   const next=cartCount.textContent;
   if(next!==last){last=next;cartCount.classList.remove("xs-cart-bump");void cartCount.offsetWidth;cartCount.classList.add("xs-cart-bump");}
  }).observe(cartCount,{childList:true,characterData:true,subtree:true});
 }
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
const revealCSS=document.createElement("style");
revealCSS.textContent=
 ".xs-reveal{opacity:0;transform:translate3d(0,28px,0);transition:opacity .75s ease,transform .75s cubic-bezier(.2,.7,.2,1)}"+
 ".xs-reveal-left{transform:translate3d(-34px,0,0)}"+
 ".xs-reveal-right{transform:translate3d(34px,0,0)}"+
 ".xs-reveal-scale{transform:translate3d(0,18px,0) scale(.97)}"+
 ".xs-reveal.xs-visible{opacity:1;transform:translate3d(0,0,0) scale(1)}"+
 ".xs-delay-1{transition-delay:.08s}.xs-delay-2{transition-delay:.16s}.xs-delay-3{transition-delay:.24s}.xs-delay-4{transition-delay:.32s}"+
 "@media(prefers-reduced-motion:reduce){.xs-reveal{opacity:1!important;transform:none!important;transition:none!important}}";
document.head.appendChild(revealCSS);
const motionStyle=document.createElement("style");
motionStyle.textContent="@keyframes xsAmbientDrift{from{transform:translate3d(-1.5%, -1%, 0) scale(1)}to{transform:translate3d(1.5%, 1%, 0) scale(1.04)}}"+
"@media(pointer:fine) and (prefers-reduced-motion:no-preference){.product-card{transform-style:preserve-3d;will-change:transform;transition:transform .22s ease,box-shadow .22s ease}.product-card.xs-tilt-active{box-shadow:0 18px 38px rgba(38,53,43,.13)}.product-card.xs-tilt-active .product-image img{transform:translateZ(18px) scale(1.045)}}"+
"@media(prefers-reduced-motion:reduce){#xs-ambient-wash{animation:none!important}}";
document.head.appendChild(motionStyle);

if(!reduce && window.matchMedia("(pointer:fine)").matches){
 const cards=new WeakSet();
 function enableTilt(root=document){
  $$(".product-card",root).forEach(card=>{
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


/* Advanced motion pack: cinematic scroll, flying add-to-cart, branded loader polish. */
if(!reduce){
 const advancedStyle=document.createElement("style");
 advancedStyle.textContent=
  "html{scroll-behavior:smooth;scroll-padding-top:92px}"+
  ".xs-scroll-progress-glow{box-shadow:0 0 10px rgba(166,161,122,.65)}"+
  ".xs-fly-item{position:fixed;z-index:10050;pointer-events:none;object-fit:contain;border-radius:12px;will-change:transform,opacity;filter:drop-shadow(0 8px 14px rgba(0,0,0,.18))}"+
  ".xs-cart-arrival{animation:xsCartArrival .55s cubic-bezier(.2,.8,.2,1)}"+
  "@keyframes xsCartArrival{0%{transform:scale(1)}35%{transform:scale(1.3) rotate(-8deg)}100%{transform:scale(1)}}"+
  "#xs-brand-intro i{height:3px!important;width:110px!important;border-radius:8px;background:linear-gradient(90deg,#A6A17A,#26352B)!important;box-shadow:0 0 16px rgba(166,161,122,.35)}"+
  ".xs-reveal{will-change:transform,opacity}"+
  "@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}";
 document.head.appendChild(advancedStyle);
 // Stagger reveal for groups while preserving the existing observer.
 $$(".product-card,.value-card").forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%6,5)*55)+"ms";});
 // Animate the selected product image toward the cart when Add to Cart is pressed.
 document.addEventListener("click",event=>{
  const button=event.target.closest(".add-cart");
  if(!button)return;
  const card=button.closest(".product-card");
  const image=card?.querySelector(".product-image img");
  const cart=$("#cart-count");
  if(!image||!cart)return;
  const start=image.getBoundingClientRect(),end=cart.getBoundingClientRect();
  if(!start.width||!start.height)return;
  const flyer=image.cloneNode(true);
  flyer.className="xs-fly-item";
  Object.assign(flyer.style,{left:start.left+"px",top:start.top+"px",width:start.width+"px",height:start.height+"px",transition:"transform .72s cubic-bezier(.2,.75,.25,1),opacity .72s ease"});
  document.body.appendChild(flyer);
  const dx=(end.left+end.width/2)-(start.left+start.width/2);
  const dy=(end.top+end.height/2)-(start.top+start.height/2);
  requestAnimationFrame(()=>{flyer.style.transform="translate("+dx+"px,"+dy+"px) scale(.12) rotate(18deg)";flyer.style.opacity=".15";});
  window.setTimeout(()=>{flyer.remove();cart.classList.remove("xs-cart-arrival");void cart.offsetWidth;cart.classList.add("xs-cart-arrival");},760);
  window.setTimeout(()=>cart.classList.remove("xs-cart-arrival"),1400);
 },true);
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