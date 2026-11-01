import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return reply({ error: "Sign in required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user?.email || !user.email_confirmed_at) return reply({ error: "Verified email required" }, 401);
    const admin = createClient(url, service);
    const body = await req.json();
    const orderNumber = String(body.order_number || "").trim();
    const reason = String(body.reason || "");
    const description = String(body.description || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!orderNumber || !["damaged","defective","wrong_item"].includes(reason) || description.length < 10 || description.length > 2000 || !items.length || items.length > 10)
      return reply({ error: "Invalid return details" }, 400);
    const { data: order, error: orderErr } = await admin.from("orders").select("id,order_number,customer_email,customer_name,customer_phone,order_status,delivered_at").eq("order_number", orderNumber).maybeSingle();
    if (orderErr || !order) return reply({ error: "Order not found" }, 404);
    if (!order.customer_email || order.customer_email.toLowerCase() !== user.email.toLowerCase()) return reply({ error: "Verified email does not match this order" }, 403);
    if (order.order_status !== "delivered" || !order.delivered_at) return reply({ error: "Only delivered orders can be returned" }, 400);
    const delivered = new Date(order.delivered_at).getTime();
    if (!Number.isFinite(delivered) || Date.now() - delivered > 7 * 86400000 || delivered > Date.now()) return reply({ error: "Return window has expired or delivery date is invalid" }, 400);
    const cleanItems: { order_item_id: string; quantity: number }[] = [];
    for (const item of items) {
      const id = String(item.order_item_id || "");
      const qty = Number(item.quantity);
      if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(qty) || qty < 1) return reply({ error: "Invalid item selection" }, 400);
      const { data: oi } = await admin.from("order_items").select("id,quantity").eq("id", id).eq("order_id", order.id).maybeSingle();
      if (!oi || qty > oi.quantity) return reply({ error: "Item does not belong to this order or quantity is invalid" }, 400);
      const { data: existing } = await admin.from("return_request_items").select("quantity,return_requests!inner(status)").eq("order_item_id", id).in("return_requests.status", ["pending_review","approved","pickup_scheduled","item_received","inspection_completed","refund_processing","refund_completed"]);
      const already = (existing || []).reduce((n: number, x: any) => n + Number(x.quantity || 0), 0);
      if (already + qty > oi.quantity) return reply({ error: "A return is already open for some or all of this item" }, 409);
      cleanItems.push({ order_item_id: id, quantity: qty });
    }
    const requestNumber = "RET-" + crypto.randomUUID().slice(0,8).toUpperCase();
    const { data: ret, error: insertErr } = await admin.from("return_requests").insert({
      request_number: requestNumber, order_id: order.id, customer_id: user.id,
      customer_name: order.customer_name, customer_phone: order.customer_phone,
      customer_email: user.email, reason, description
    }).select("id").single();
    if (insertErr) throw insertErr;
    const { error: itemsErr } = await admin.from("return_request_items").insert(cleanItems.map(x => ({ ...x, return_id: ret.id })));
    if (itemsErr) { await admin.from("return_requests").delete().eq("id", ret.id); throw itemsErr; }
    await admin.from("return_status_history").insert({ return_id: ret.id, new_status: "pending_review", note: "Customer submitted an email-verified return request", changed_by: user.id });
    return reply({ message: "Return request submitted. Reference: " + requestNumber, request_number: requestNumber });
  } catch (e) {
    console.error(e);
    return reply({ error: "Unable to submit return request" }, 500);
  }
});