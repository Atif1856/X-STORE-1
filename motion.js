/* X STORE — premium motion controller v2 (no commerce logic) */
(()=>{"use strict";
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const progress=document.createElement("div");progress.id="xs-progress";document.body.appendChild(progress);
const topButton=document.createElement("button");topButton.id="xs-back-top";topButton.type="button";topButton.setAttribute("aria-label","Back to top");topButton.innerHTML="↑";document.body.appendChild(topButton);
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