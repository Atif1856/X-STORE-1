/* X STORE — scroll reveal and gentle page transitions */
(()=>{"use strict";
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!reduce && "IntersectionObserver" in window){
 const selectors="main section, main article, .panel, .about-cta, .contact-strip, .editorial, .product-card, .value-card";
 const nodes=[...document.querySelectorAll(selectors)].filter(el=>!el.closest("header,footer"));
 nodes.forEach((el,i)=>{el.classList.add("xs-reveal");if(i%4)el.classList.add("xs-reveal-delay-"+(i%4));});
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("xs-visible");observer.unobserve(entry.target);}}),{threshold:.10,rootMargin:"0px 0px -35px 0px"});
 nodes.forEach(el=>observer.observe(el));
 const grid=document.getElementById("product-grid");
 if(grid){new MutationObserver(()=>grid.querySelectorAll(".product-card:not(.xs-reveal)").forEach((el,i)=>{el.classList.add("xs-reveal","xs-visible");})).observe(grid,{childList:true,subtree:true});}
}
document.addEventListener("click",e=>{const a=e.target.closest("a[href]");if(!a||reduce||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const href=a.getAttribute("href");if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:")||a.target==="_blank"||a.hasAttribute("download"))return;const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;e.preventDefault();document.body.classList.add("xs-page-leaving");setTimeout(()=>location.href=url.href,140);});
})();