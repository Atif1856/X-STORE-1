(() => {
  "use strict";
  const cfg = window.XSTORE_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const css = document.createElement("style");
  css.textContent = `
    #xs-ai-launch{position:fixed;left:22px;bottom:22px;z-index:10020;background:#26352B;color:#EEF0E7;border:1px solid #A6A17A;border-radius:28px;padding:13px 18px;font-weight:700;box-shadow:0 8px 24px #26352b33;cursor:pointer}
    #xs-ai-box{position:fixed;left:18px;bottom:80px;z-index:10021;width:min(390px,calc(100vw - 28px));height:min(590px,calc(100dvh - 110px));background:#EEF0E7;border:1px solid #A6A17A;border-radius:16px;box-shadow:0 18px 55px #0003;display:none;overflow:hidden;color:#26352B;font:14px Arial,sans-serif}
    #xs-ai-box.open{display:flex;flex-direction:column}#xs-ai-head{background:#26352B;color:#EEF0E7;padding:15px;display:flex;justify-content:space-between;align-items:center}
    #xs-ai-head button{background:none;border:0;color:inherit;font-size:23px;cursor:pointer}#xs-ai-messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
    .xs-ai-msg{max-width:88%;padding:10px 12px;border-radius:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.xs-ai-user{align-self:flex-end;background:#26352B;color:#fff}.xs-ai-bot{align-self:flex-start;background:#fff;color:#26352B;border:1px solid #d9ddcf}
    #xs-ai-track{padding:9px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:7px}#xs-ai-track input,#xs-ai-input{min-width:0;padding:11px;border:1px solid #c8cebf;border-radius:9px;background:#fff;font:inherit}
    #xs-ai-form{padding:10px 12px 13px;display:flex;gap:7px}#xs-ai-input{flex:1}#xs-ai-send{border:0;border-radius:9px;background:#26352B;color:#fff;padding:0 15px;font-weight:700;cursor:pointer}
    #xs-ai-hint{font-size:11px;color:#687267;padding:0 13px 8px}#xs-ai-send:disabled{opacity:.5}
    @media(max-width:480px){#xs-ai-launch{left:12px;bottom:12px}#xs-ai-box{left:10px;bottom:65px;width:calc(100vw - 20px)}}
  `;
  document.head.appendChild(css);
  const launch = document.createElement("button");
  launch.id = "xs-ai-launch"; launch.type = "button"; launch.textContent = "Ask X STORE AI";
  const box = document.createElement("section");
  box.id = "xs-ai-box";
  box.innerHTML = '<div id="xs-ai-head"><strong>X STORE AI ASSISTANT</strong><button type="button" id="xs-ai-close" aria-label="Close">×</button></div><div id="xs-ai-messages" aria-live="polite"><div class="xs-ai-msg xs-ai-bot">Hi! I can help you find products, check listed prices and stock, or guide you with order tracking.</div></div><div id="xs-ai-track"><input id="xs-ai-order" maxlength="40" placeholder="Order number (optional)"><input id="xs-ai-phone" maxlength="25" type="tel" placeholder="Registered phone (optional)"></div><div id="xs-ai-hint">For order status, enter both details above with your question.</div><form id="xs-ai-form"><input id="xs-ai-input" maxlength="1200" placeholder="Ask about products or delivery..." required><button id="xs-ai-send" type="submit">Send</button></form>';
  document.body.append(launch, box);
  const $ = id => document.getElementById(id);
  launch.onclick = () => { box.classList.add("open"); launch.style.display = "none"; $("xs-ai-input").focus(); };
  $("xs-ai-close").onclick = () => { box.classList.remove("open"); launch.style.display = "block"; };
  const addMessage = (text, who) => { const el=document.createElement("div"); el.className="xs-ai-msg "+(who==="user"?"xs-ai-user":"xs-ai-bot"); el.textContent=text; $("xs-ai-messages").appendChild(el); $("xs-ai-messages").scrollTop=$("xs-ai-messages").scrollHeight; };
  let catalogue = [];
  async function getCatalogue() {
    if (catalogue.length) return catalogue;
    const { data, error } = await sb.from("products").select("title,description,short_description,price,sale_price,stock,sku").eq("is_published",true).limit(60);
    if (error) throw error;
    catalogue = (data || []).map(p => ({title:p.title, description:p.short_description||p.description||"", price:Number(p.sale_price)>0&&Number(p.sale_price)<Number(p.price)?Number(p.sale_price):Number(p.price), stock:Number(p.stock||0), sku:p.sku||""}));
    return catalogue;
  }
  $("xs-ai-form").addEventListener("submit", async event => {
    event.preventDefault();
    const message=$("xs-ai-input").value.trim(); if(!message)return;
    $("xs-ai-input").value=""; addMessage(message,"user");
    const btn=$("xs-ai-send"); btn.disabled=true; btn.textContent="...";
    try {
      const context={catalogue:await getCatalogue()};
      const order=$("xs-ai-order").value.trim(), phone=$("xs-ai-phone").value.trim();
      if(order && phone) {
        const {data,error}=await sb.rpc("track_xstore_order",{p_order_number:order,p_phone:phone});
        if(error) throw error;
        if(data && data.success) context.verifiedOrderContext={order_number:data.order_number,status:data.status,updated_at:data.updated_at,history:Array.isArray(data.history)?data.history:[]};
        else context.orderLookupMessage=data?.message||"Order not found. No verified order information available.";
      }
      const {data,error}=await sb.functions.invoke("xstore-assistant",{body:{message,context}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      addMessage(data?.answer||"I couldn't prepare a reply. Please try again.","bot");
    } catch(error) {
      console.error("X STORE AI:",error);
      addMessage("AI service is not connected yet or is temporarily unavailable. Please use Track Order or Customer Support for help.","bot");
    } finally {btn.disabled=false;btn.textContent="Send";}
  });
})();