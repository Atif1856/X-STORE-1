(() => {
  "use strict";
  const cfg=window.XSTORE_CONFIG||{};
  if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>"PKR "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:2});
  const names={pending_review:"Pending review",approved:"Approved",rejected:"Rejected",pickup_scheduled:"Pickup scheduled",item_received:"Item received",inspection_completed:"Inspection completed",refund_processing:"Refund processing",refund_completed:"Refund completed",cancelled:"Cancelled"};
  const next=["pending_review","approved","rejected","pickup_scheduled","item_received","inspection_completed","refund_processing","refund_completed","cancelled"];
  let selected=null,loaded=false;
  function message(t,bad=false){const el=$("#returns-message");if(!el)return;el.textContent=t;el.classList.remove("hidden");el.style.borderColor=bad?"#b3261e":"#16834b";}
  function statusOptions(value){return next.map(s=>'<option value="'+s+'" '+(s===value?"selected":"")+'>'+names[s]+'</option>').join("");}
  async function load(){
    const body=$("#admin-returns-list");if(!body)return;
    body.innerHTML='<tr><td colspan="7">Loading return requests…</td></tr>';
    const {data,error}=await db.from("return_requests").select("*,return_request_items(quantity,order_item_id,order_items(product_title,sku,unit_price,line_total,quantity))").order("created_at",{ascending:false});
    if(error){body.innerHTML='<tr><td colspan="7">Could not load requests. Check migration and admin permissions.</td></tr>';message(error.message,true);return;}
    body.innerHTML=data.length?data.map(r=>'<tr><td><strong>'+esc(r.request_number)+'</strong></td><td>'+esc(r.order_id)+'</td><td>'+esc(r.customer_name)+'<br><small>'+esc(r.customer_phone)+'</small></td><td>'+esc(r.reason.replaceAll("_"," "))+'</td><td>'+esc(names[r.status]||r.status)+'</td><td>'+esc(new Date(r.created_at).toLocaleDateString())+'</td><td><button class="btn btn-outline btn-small" data-return="'+esc(r.id)+'">Review</button></td></tr>').join(""):'<tr><td colspan="7">No return requests yet.</td></tr>';
    body.querySelectorAll("[data-return]").forEach(b=>b.addEventListener("click",()=>detail(data.find(x=>x.id===b.dataset.return))));
    loaded=true;
  }
  function detail(r){
    selected=r;
    const items=(r.return_request_items||[]).map(x=>'<li>'+esc(x.order_items?.product_title||"Product")+' × '+esc(x.quantity)+' — '+money(x.order_items?.unit_price)+'</li>').join("");
    const el=$("#return-detail");el.classList.remove("hidden");
    el.innerHTML='<h3>Return '+esc(r.request_number)+'</h3><p><strong>Customer:</strong> '+esc(r.customer_name)+' · '+esc(r.customer_phone)+'</p><p><strong>Reason:</strong> '+esc(r.reason.replaceAll("_"," "))+'</p><p>'+esc(r.description)+'</p><h4>Items</h4><ul>'+items+'</ul><div class="form-grid"><label>Status<select id="return-status">'+statusOptions(r.status)+'</select></label><label>Refund amount (PKR)<input id="return-refund" type="number" min="0" step="0.01" value="'+esc(r.refund_amount??"")+'"></label><label class="full">Admin note<textarea id="return-note" rows="3">'+esc(r.admin_note||"")+'</textarea></label><button id="save-return" class="btn btn-dark" type="button">Save update</button></div><p class="small muted">Mark Refund Completed only after the payment has actually been sent and verified. Record the payment reference in the admin note.</p>';
    $("#save-return").addEventListener("click",save);
  }
  async function save(){
    if(!selected)return;
    const status=$("#return-status").value,amount=$("#return-refund").value,note=$("#return-note").value.trim();
    if(status==="refund_completed"&&!note){message("Add the confirmed refund payment reference in the admin note before completing.",true);return;}
    const {data:userData}=await db.auth.getUser();
    const uid=userData?.user?.id||null;
    const {error}=await db.from("return_requests").update({status,refund_amount:amount===""?null:Number(amount),admin_note:note,reviewed_at:["approved","rejected"].includes(status)?new Date().toISOString():selected.reviewed_at,updated_at:new Date().toISOString()}).eq("id",selected.id);
    if(error){message(error.message,true);return;}
    const h=await db.from("return_status_history").insert({return_id:selected.id,old_status:selected.status,new_status:status,note:note||null,changed_by:uid});
    if(h.error){message("Request updated, but status history could not be saved: "+h.error.message,true);return;}
    message("Return request updated.");
    await load();
    const {data}=await db.from("return_requests").select("*,return_request_items(quantity,order_item_id,order_items(product_title,sku,unit_price,line_total,quantity))").eq("id",selected.id).single();
    if(data)detail(data);
  }
  document.addEventListener("click",e=>{
    const tab=e.target.closest('[data-tab="returns"]');
    if(tab&&!loaded)load();
  });
  $("#refresh-returns")?.addEventListener("click",load);
})();