import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const phoneKey=(s:string)=>s.replace(/[^0-9]/g,"").replace(/^92/,"0");
const labels:Record<string,string>={pending_confirmation:"Pending confirmation",confirmed:"Confirmed",processing:"Processing",shipped:"Shipped",out_for_delivery:"Out for delivery",delivered:"Delivered",cancelled:"Cancelled",returned:"Returned"};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,service);
  const b=await req.json(),action=String(b.action||""),number=String(b.order_number||"").trim(),phone=phoneKey(String(b.phone||""));
  if(!number||phone.length<10||phone.length>13)return reply({error:"Valid order number aur checkout phone number enter karein."},400);
  const {data:order,error}=await admin.from("orders").select("id,order_number,customer_name,customer_phone,order_status,delivered_at,total").eq("order_number",number).maybeSingle();
  if(error||!order||phoneKey(order.customer_phone||"")!==phone)return reply({error:"Order details match nahi huin. Order number aur checkout phone dobara check karein."},404);
  if(action==="lookup"){
   const delivered=order.order_status==="delivered",date=order.delivered_at?new Date(order.delivered_at).getTime():NaN,eligible=delivered&&Number.isFinite(date)&&date<=Date.now()&&Date.now()-date<=7*86400000;
   let items:any[]=[];if(eligible){const q=await admin.from("order_items").select("id,product_title,quantity").eq("order_id",order.id);if(q.error)throw q.error;items=q.data||[];}
   return reply({order:{order_number:order.order_number,order_status:order.order_status,status_label:labels[order.order_status]||order.order_status,total:order.total,return_eligible:eligible,items}});
  }
  if(action==="request_cancel"){
   if(order.order_status==="delivered"||["cancelled","returned"].includes(order.order_status))return reply({error:"Is order ke liye cancellation request available nahi hai."},400);
   const existing=await admin.from("cancellation_requests").select("id").eq("order_id",order.id).eq("status","pending_review").maybeSingle();
   if(existing.data)return reply({error:"Is order ki cancellation request pehle se pending hai."},409);
   const ref="CAN-"+crypto.randomUUID().slice(0,8).toUpperCase(),ins=await admin.from("cancellation_requests").insert({request_number:ref,order_id:order.id,customer_name:order.customer_name,customer_phone:order.customer_phone,reason:String(b.reason||"").slice(0,1000)||null});
   if(ins.error)throw ins.error;return reply({message:"Cancellation request received. Reference: "+ref+". Order admin approval tak active rahega."});
  }
  if(action==="request_return"){
   if(order.order_status!=="delivered"||!order.delivered_at)return reply({error:"Sirf delivered orders return ke liye eligible hain."},400);
   const delivered=new Date(order.delivered_at).getTime();if(!Number.isFinite(delivered)||delivered>Date.now()||Date.now()-delivered>7*86400000)return reply({error:"7-day return window expire ho chuki hai."},400);
   const reason=String(b.reason||""),description=String(b.description||"").trim(),items=Array.isArray(b.items)?b.items:[];
   if(!["damaged","defective","wrong_item"].includes(reason)||description.length<10||description.length>2000||!items.length||items.length>10)return reply({error:"Return details complete karein."},400);
   const clean:any[]=[];
   for(const item of items){
    const id=String(item.order_item_id||""),qty=Number(item.quantity);if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(qty)||qty<1)return reply({error:"Invalid item selection."},400);
    const {data:oi}=await admin.from("order_items").select("id,quantity").eq("id",id).eq("order_id",order.id).maybeSingle();if(!oi||qty>oi.quantity)return reply({error:"Selected item ya quantity invalid hai."},400);
    const {data:existing}=await admin.from("return_request_items").select("quantity,return_requests!inner(status)").eq("order_item_id",id).in("return_requests.status",["pending_review","approved","pickup_scheduled","item_received","inspection_completed","refund_processing","refund_completed"]);
    const already=(existing||[]).reduce((n:number,x:any)=>n+Number(x.quantity||0),0);if(already+qty>oi.quantity)return reply({error:"Is item ki return request pehle se open hai."},409);clean.push({order_item_id:id,quantity:qty});
   }
   const ref="RET-"+crypto.randomUUID().slice(0,8).toUpperCase(),{data:ret,error:re}=await admin.from("return_requests").insert({request_number:ref,order_id:order.id,customer_name:order.customer_name,customer_phone:order.customer_phone,reason,description}).select("id").single();
   if(re)throw re;const it=await admin.from("return_request_items").insert(clean.map(x=>({...x,return_id:ret.id})));if(it.error){await admin.from("return_requests").delete().eq("id",ret.id);throw it.error;}
   await admin.from("return_status_history").insert({return_id:ret.id,new_status:"pending_review",note:"Customer submitted a phone/order verified return request"});
   return reply({message:"Return request received. Reference: "+ref+". Admin review ke baad update milega."});
  }
  return reply({error:"Unknown action."},400);
 }catch(e){console.error(e);return reply({error:"Request process nahi ho saki. Admin se contact karein."},500);}
});