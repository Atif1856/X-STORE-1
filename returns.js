(() => {
"use strict";
const $=id=>document.getElementById(id);let client=null;
const say=t=>$("status").textContent=t;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.addEventListener("load",()=>{
 const c=window.XSTORE_CONFIG;if(!c||!window.supabase)return say("Store setup could not load.");
 client=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);$("lookup").onclick=lookup;
});
async function call(body){const {data,error}=await client.functions.invoke("returns-create",{body});if(error)throw new Error(data?.error||error.message||"Request failed.");if(data?.error)throw new Error(data.error);return data;}
async function lookup(){
 const order_number=$("order-number").value.trim(),phone=$("phone").value.trim();
 if(!order_number||!phone)return say("Order number aur checkout phone number dono enter karein.");
 $("lookup").disabled=true;say("Order check ho raha hai…");$("order-result").hidden=true;
 try{const d=await call({action:"lookup",order_number,phone});renderOrder(d.order);say("Order mil gaya. Neeche available action select karein.");}
 catch(e){say(e.message);}finally{$("lookup").disabled=false;}
}
function renderOrder(o){
 $("order-result").hidden=false;$("order-title").textContent="Order "+o.order_number;
 $("order-meta").textContent="Status: "+o.status_label+" · Total: PKR "+Number(o.total||0).toLocaleString("en-PK");
 const area=$("action-area");
 if(o.order_status==="delivered"){
  if(!o.return_eligible){area.innerHTML="<p>Is order ki 7-day return window khatam ho chuki hai, ya delivery date available nahi hai.</p>";return;}
  if(!o.items?.length){area.innerHTML="<p>Returnable items available nahi hain.</p>";return;}
  area.innerHTML='<h3>Return request</h3><p>Damaged, defective ya wrong item select karein.</p><label>Reason</label><select id="reason"><option value="damaged">Damaged</option><option value="defective">Defective</option><option value="wrong_item">Wrong item</option></select><label>Description (minimum 10 characters)</label><textarea id="description" rows="3" minlength="10" maxlength="2000"></textarea><h4>Select item(s) and quantity</h4>'+o.items.map(i=>'<div><label><input type="checkbox" class="return-item" value="'+esc(i.id)+'"> '+esc(i.product_title)+' (ordered '+i.quantity+')</label> <input type="number" class="return-qty" data-item="'+esc(i.id)+'" min="1" max="'+Number(i.quantity)+'" value="1" style="width:75px"></div>').join("")+'<button id="send-return" class="btn btn-dark" type="button">Submit return request</button>';
  $("send-return").onclick=async()=>{
   const items=[...document.querySelectorAll(".return-item:checked")].map(x=>({order_item_id:x.value,quantity:Number(document.querySelector('[data-item="'+CSS.escape(x.value)+'"]').value)})),description=$("description").value.trim();
   if(!items.length||description.length<10)return say("Kam az kam aik item select karein aur description 10 characters se zyada likhein.");
   $("send-return").disabled=true;try{const d=await call({action:"request_return",order_number:$("order-number").value.trim(),phone:$("phone").value.trim(),reason:$("reason").value,description,items});area.textContent=d.message;say("Return request submit ho gayi.");}catch(e){say(e.message);$("send-return").disabled=false;}
  };
 }else{
  area.innerHTML='<h3>Cancellation request</h3><p>Order delivered nahi hua. Cancellation admin approval ke baad process hogi.</p><label>Reason (optional)</label><textarea id="cancel-reason" rows="3" maxlength="1000"></textarea><button id="send-cancel" class="btn btn-dark" type="button">Request cancellation</button>';
  $("send-cancel").onclick=async()=>{$("send-cancel").disabled=true;try{const d=await call({action:"request_cancel",order_number:$("order-number").value.trim(),phone:$("phone").value.trim(),reason:$("cancel-reason").value.trim()});area.textContent=d.message;say("Cancellation request submit ho gayi.");}catch(e){say(e.message);$("send-cancel").disabled=false;}};
 }
}
})();