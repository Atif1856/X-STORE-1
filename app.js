
(() => {
  const cfg = window.XSTORE_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.startsWith("https://") &&
    !cfg.SUPABASE_URL.includes("PASTE_") &&
    !cfg.SUPABASE_ANON_KEY.includes("PASTE_");

  const sb = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => `${cfg.CURRENCY || "PKR"} ${Number(n || 0).toLocaleString("en-PK", {maximumFractionDigits:2})}`;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  const slug = s => String(s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  const toast = msg => {
    const el=$("#toast");
    if(el){
      el.textContent=msg;
      el.classList.add("show");
      setTimeout(()=>el.classList.remove("show"),3200);
    } else {
      alert(msg);
    }
  };

  const announceConfig = () => {
    if(!sb) toast("Setup needed: add Supabase URL and anon key in config.js.");
  };

  const getCart = () => {
    try {
      const cart=JSON.parse(localStorage.getItem("xstore_cart")||"[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  };

  const setCart = items => {
    localStorage.setItem("xstore_cart",JSON.stringify(items));
    updateCartCount();
  };

  const cartKey = item => `${item.id}|${item.selected_size||""}`;

  const updateCartCount = () => {
    const el=$("#cart-count");
    if(el)el.textContent=getCart().reduce((n,x)=>n+Number(x.qty||0),0);
    updateFloatingCheckout();
  };

  // FLOATING CHECKOUT BAR
  function updateFloatingCheckout(){
    if(!$("#product-grid"))return;

    let bar=$("#floating-checkout");

    if(!bar){
      bar=document.createElement("div");
      bar.id="floating-checkout";
      bar.innerHTML=`
        <div class="floating-cart-info">
          <strong id="floating-cart-count">0 Items</strong>
          <span id="floating-cart-total">PKR 0</span>
        </div>
        <a href="checkout.html" class="floating-checkout-btn">Checkout →</a>
      `;
      document.body.appendChild(bar);

      const style=document.createElement("style");
      style.textContent=`
        #floating-checkout{
          position:fixed;z-index:9999;left:50%;bottom:22px;
          transform:translateX(-50%);width:min(440px,calc(100% - 28px));
          display:none;align-items:center;justify-content:space-between;
          gap:15px;padding:13px 16px;background:#f1f0e8;
          border:1px solid rgba(217,51,51,.35);border-radius:16px;
          box-shadow:0 8px 35px rgba(0,0,0,.2);color:#171717;
        }
        .floating-cart-info{display:flex;flex-direction:column;gap:4px;font-size:14px}
        .floating-cart-info span{font-size:12px;opacity:.7}
        .floating-checkout-btn{background:#d93333;color:white;text-decoration:none;
          padding:12px 19px;border-radius:10px;font-weight:700;white-space:nowrap}
        .floating-checkout-btn:hover{background:#b92323}
        @media(max-width:480px){#floating-checkout{bottom:12px}}
      `;
      document.head.appendChild(style);
    }

    const cart=getCart();
    const count=cart.reduce((n,x)=>n+Number(x.qty||0),0);
    const total=cart.reduce((n,x)=>n+Number(x.price||0)*Number(x.qty||0),0);

    bar.style.display=count>0?"flex":"none";
    $("#floating-cart-count").textContent=`${count} ${count===1?"Item":"Items"}`;
    $("#floating-cart-total").textContent=`Items Total: ${money(total)}`;
  }

  const productPrice = p => Number(
    p.sale_price && Number(p.sale_price)>0 && Number(p.sale_price)<Number(p.price)
      ? p.sale_price : p.price
  );

  const imgFallback = "data:image/svg+xml,"+encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="100%" height="100%" fill="#eee9df"/><text x="50%" y="50%" text-anchor="middle" fill="#171717" font-family="Georgia" font-size="52">X STORE</text></svg>'
  );

  const imageOf = p =>
    p.image_url ||
    (p.image_path && sb
      ? sb.storage.from("product-images").getPublicUrl(p.image_path).data.publicUrl
      : "") ||
    imgFallback;

  const normalizeSizes = sizes => {
    if(Array.isArray(sizes))return sizes.map(x=>String(x).trim()).filter(Boolean);
    return [];
  };

  async function productsQuery(){
    if(!sb)return {data:[],error:new Error("Supabase is not configured.")};

    return sb.from("products")
      .select("id,title,slug,description,short_description,price,sale_price,sku,stock,image_url,image_path,is_featured,is_published,category_id,sizes,categories(name)")
      .eq("is_published",true)
      .order("created_at",{ascending:false});
  }

  function productCard(p){
    const hasSizes=normalizeSizes(p.sizes).length>0;

    return `<article class="product-card">
      <a class="product-image" href="product.html?id=${encodeURIComponent(p.id)}">
        <img loading="lazy" src="${esc(imageOf(p))}" alt="${esc(p.title)}" onerror="this.src='${imgFallback}'">
        ${p.is_featured?'<span class="product-tag">FEATURED</span>':''}
      </a>
      <div class="product-info">
        <p class="product-category">${esc(p.categories?.name||"X STORE")}</p>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a></h3>
        <p class="product-desc">${esc(p.short_description||p.description||"")}</p>
        <div class="price-row">
          <strong>${money(productPrice(p))}</strong>
          ${Number(p.sale_price)>0&&Number(p.sale_price)<Number(p.price)?`<del>${money(p.price)}</del>`:""}
        </div>
        <button class="btn btn-dark btn-block add-cart" data-id="${esc(p.id)}" ${Number(p.stock)<=0?"disabled":""}>
          ${Number(p.stock)<=0?"Out of stock":hasSizes?"Choose size":"Add to cart"}
        </button>
      </div>
    </article>`;
  }

  async function renderHome(){
    const grid=$("#product-grid");
    if(!grid)return;

    if(!sb){
      grid.innerHTML='<div class="notice">Connect Supabase to load your products. Follow the README setup guide.</div>';
      announceConfig();
      return;
    }

    const {data,error}=await productsQuery();

    if(error){
      grid.innerHTML='<div class="notice">Could not load products. Check the database setup and public product policies.</div>';
      return;
    }

    let all=data||[];
    let cats=[...new Set(all.map(p=>p.categories?.name).filter(Boolean))];
    let active="All";

    const catEl=$("#category-list");
    const search=$("#search");

    const draw=()=>{
      const q=(search?.value||"").toLowerCase();
      const filtered=all.filter(p=>
        (active==="All"||p.categories?.name===active) &&
        `${p.title} ${p.description||""} ${p.categories?.name||""}`.toLowerCase().includes(q)
      );

      grid.innerHTML=filtered.length
        ? filtered.map(productCard).join("")
        : '<div class="notice">No products found. Add products from the admin panel.</div>';
    };

    if(catEl){
      catEl.innerHTML=["All",...cats].map(c=>
        `<button class="chip ${c==="All"?"selected":""}" data-cat="${esc(c)}">${esc(c)}</button>`
      ).join("");
    }

    catEl?.addEventListener("click",e=>{
      const b=e.target.closest("[data-cat]");
      if(!b)return;
      active=b.dataset.cat;
      $$(".chip",catEl).forEach(x=>x.classList.toggle("selected",x===b));
      draw();
    });

    search?.addEventListener("input",draw);
    draw();
    updateFloatingCheckout();
  }

  async function addProductToCart(id){
    if(!sb){announceConfig();return;}

    const {data,error}=await sb.from("products")
      .select("id,title,slug,price,sale_price,stock,image_url,image_path,is_published,sizes")
      .eq("id",id)
      .eq("is_published",true)
      .single();

    if(error||!data){
      toast("Product is unavailable.");
      return;
    }

    if(Number(data.stock)<1){
      toast("Out of stock.");
      return;
    }

    if(normalizeSizes(data.sizes).length){
      location.href=`product.html?id=${encodeURIComponent(id)}`;
      return;
    }

    const cart=getCart();
    const found=cart.find(x=>x.id===id&&!x.selected_size);
    const totalQty=cart.filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0);

    if(totalQty+1>Number(data.stock)){
      toast("Not enough stock available.");
      return;
    }

    if(found){
      found.qty++;
    }else{
      cart.push({
        id:data.id,
        title:data.title,
        price:productPrice(data),
        image_url:data.image_url,
        image_path:data.image_path,
        selected_size:null,
        qty:1
      });
    }

    setCart(cart);
    toast("Added to cart.");
  }

  async function renderCart(){
    const box=$("#cart-items");
    const sum=$("#cart-summary");
    if(!box||!sum)return;

    updateCartCount();
    const cart=getCart();

    if(!cart.length){
      box.innerHTML='<p>Your cart is empty.</p><a class="btn btn-dark" href="index.html#shop">Browse products</a>';
      sum.innerHTML="";
      return;
    }

    if(!sb){
      box.innerHTML='<div class="notice">Supabase setup is required to verify product prices and stock.</div>';
      sum.innerHTML="";
      return;
    }

    const ids=[...new Set(cart.map(x=>x.id))];

    const {data,error}=await sb.from("products")
      .select("id,title,price,sale_price,stock,image_url,image_path,is_published,sizes")
      .in("id",ids);

    if(error){
      box.innerHTML='<div class="notice">Could not verify cart items.</div>';
      return;
    }

    const map=new Map((data||[]).map(p=>[p.id,p]));
    let valid=[];

    for(const item of cart){
      const p=map.get(item.id);
      if(!p||!p.is_published)continue;

      const size=item.selected_size||null;
      const sizes=normalizeSizes(p.sizes);

      if(size&&!sizes.includes(size))continue;
      if(!size&&sizes.length)continue;

      valid.push({
        ...item,
        title:p.title,
        price:productPrice(p),
        stock:p.stock,
        image_url:p.image_url,
        image_path:p.image_path,
        selected_size:size
      });
    }

    const totals={};
    valid.forEach(x=>totals[x.id]=(totals[x.id]||0)+Number(x.qty||0));
    valid=valid.filter(x=>Number(x.stock)>=totals[x.id]);

    setCart(valid);

    const subtotal=valid.reduce((n,p)=>n+p.price*p.qty,0);

    box.innerHTML=valid.length
      ? valid.map(p=>{
        const key=cartKey(p);
        return `
          <div class="cart-item">
            <img src="${esc(imageOf(p))}" alt="">
            <div class="cart-item-main">
              <strong>${esc(p.title)}</strong>
              ${p.selected_size?`<span>Size: ${esc(p.selected_size)}</span>`:""}
              <span>${money(p.price)} each</span>
              <div class="qty-control">
                <button data-qty="-1" data-key="${esc(key)}" data-stock="${Number(p.stock)}" aria-label="Decrease quantity">−</button>
                <span>${p.qty}</span>
                <button data-qty="1" data-key="${esc(key)}" data-stock="${Number(p.stock)}" aria-label="Increase quantity">+</button>
                <button class="text-button remove-item" data-remove="${esc(key)}">Remove</button>
              </div>
            </div>
            <strong>${money(p.price*p.qty)}</strong>
          </div>
        `;
      }).join("")
      : '<p>Your cart is empty or products are no longer available.</p>';

    sum.innerHTML=`
      <h2>Order summary</h2>
      <div class="total-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="total-line"><span>Shipping</span><span>${money(cfg.SHIPPING_FEE||0)}</span></div>
      <div class="total-line grand-total"><span>Total</span><strong>${money(subtotal+Number(cfg.SHIPPING_FEE||0))}</strong></div>
      <a class="btn btn-dark btn-block ${valid.length?"":"disabled"}" href="checkout.html">Proceed to checkout</a>
      <p class="small muted">Payment: Cash on Delivery</p>
    `;

    box.onclick=e=>{
      const q=e.target.closest("[data-qty]");
      const r=e.target.closest("[data-remove]");

      if(r){
        setCart(getCart().filter(x=>cartKey(x)!==r.dataset.remove));
        renderCart();
      }else if(q){
        const c=getCart();
        const i=c.find(x=>cartKey(x)===q.dataset.key);
        if(!i)return;

        const change=Number(q.dataset.qty);
        const next=Number(i.qty)+change;
        const stock=Number(q.dataset.stock||999999);
        const totalProductQty=c.filter(x=>x.id===i.id)
          .reduce((n,x)=>n+Number(x.qty||0),0);

        if(next<1){
          setCart(c.filter(x=>cartKey(x)!==cartKey(i)));
        }else if(change>0&&totalProductQty+change>stock){
          toast("Stock limit reached.");
          return;
        }else{
          i.qty=next;
          setCart(c);
        }

        renderCart();
      }
    };
  }

  async function renderCheckout(){
    const form=$("#checkout-form");
    if(!form)return;

    const cart=getCart();
    const totalEl=$("#checkout-total");

    if(!cart.length){
      form.innerHTML='<div class="full notice">Your cart is empty. <a href="index.html#shop">Shop products</a></div>';
      return;
    }

    if(!sb){
      announceConfig();
      form.insertAdjacentHTML("afterbegin",'<div class="full notice">Connect Supabase before accepting orders.</div>');
      return;
    }

    const sub=cart.reduce((n,x)=>n+Number(x.price)*Number(x.qty),0);

    if(totalEl){
      totalEl.innerHTML=`
        <span>Subtotal: ${money(sub)}</span>
        <span>Shipping: ${money(cfg.SHIPPING_FEE||0)}</span>
        <strong>Total: ${money(sub+Number(cfg.SHIPPING_FEE||0))}</strong>
      `;
    }

    form.addEventListener("submit",async e=>{
      e.preventDefault();

      const btn=$('button[type="submit"]',form);
      if(!btn)return;
      btn.disabled=true;
      btn.textContent="Submitting order…";

      try{
        const ids=[...new Set(cart.map(x=>x.id))];

        const {data:products,error:pe}=await sb.from("products")
          .select("id,title,sku,price,sale_price,stock,is_published,sizes")
          .in("id",ids);

        if(pe)throw pe;

        const map=new Map((products||[]).map(p=>[p.id,p]));
        const quantities={};
        cart.forEach(c=>quantities[c.id]=(quantities[c.id]||0)+Number(c.qty||0));

        let subtotal=0,items=[];

        for(const c of cart){
          const p=map.get(c.id);

          if(!p||!p.is_published)
            throw new Error(`${c.title} is no longer available.`);

          if(Number(p.stock)<quantities[p.id])
            throw new Error(`Not enough stock for ${p.title}.`);

          const sizes=normalizeSizes(p.sizes);
          const selectedSize=c.selected_size||null;

          if(sizes.length&&!selectedSize)
            throw new Error(`Please select a size for ${p.title}.`);

          if(selectedSize&&!sizes.includes(selectedSize))
            throw new Error(`Selected size is unavailable for ${p.title}.`);

          const price=productPrice(p);
          subtotal+=price*Number(c.qty);

          items.push({
            product_id:p.id,
            product_title:p.title,
            sku:p.sku||null,
            unit_price:price,
            quantity:Number(c.qty),
            line_total:price*Number(c.qty),
            selected_size:selectedSize
          });
        }

        const fd=new FormData(form);
        const orderNo="XS-"+Date.now().toString().slice(-9);
        const shipping=Number(cfg.SHIPPING_FEE||0);

        const orderPayload={
          order_number:orderNo,
          customer_name:String(fd.get("full_name")||"").trim(),
          customer_phone:String(fd.get("phone")||"").trim(),
          customer_email:String(fd.get("email")||"").trim()||null,
          delivery_address:String(fd.get("address")||"").trim(),
          city:String(fd.get("city")||"").trim(),
          province:String(fd.get("province")||"").trim(),
          delivery_instructions:String(fd.get("instructions")||"").trim()||null,
          payment_method:"COD",
          payment_status:"pending_collection",
          order_status:"pending_confirmation",
          subtotal,
          shipping_fee:shipping,
          discount:0,
          total:subtotal+shipping
        };

        const {data:order,error:oe}=await sb.from("orders")
          .insert(orderPayload)
          .select("id,order_number")
          .single();

        if(oe)throw oe;

        const rows=items.map(i=>({...i,order_id:order.id}));
        const {error:ie}=await sb.from("order_items").insert(rows);

        if(ie){
          await sb.from("orders").delete().eq("id",order.id);
          throw ie;
        }

        sessionStorage.setItem("xstore_last_order",order.order_number);
        setCart([]);
        location.href="order-success.html";

      }catch(err){
        toast(err.message||"Could not place order. Please try again.");
        btn.disabled=false;
        btn.textContent="Place COD order";
      }
    },{once:true});
  }

  async function requireAdmin(){
    if(!sb){
      location.href="admin-login.html";
      return null;
    }

    const {data:{session}}=await sb.auth.getSession();
    if(!session){
      location.href="admin-login.html";
      return null;
    }

    const {data:profile,error}=await sb.from("profiles")
      .select("role").eq("id",session.user.id).single();

    if(error||profile?.role!=="admin"){
      await sb.auth.signOut();
      alert("This account is not authorized as an administrator.");
      location.href="admin-login.html";
      return null;
    }

    return session.user;
  }

  async function loginAdmin(){
    const form=$("#admin-login-form");
    if(!form)return;

    form.addEventListener("submit",async e=>{
      e.preventDefault();

      const btn=$('button[type="submit"]',form);
      const msg=$("#login-message");
      btn.disabled=true;
      msg.textContent="Signing in…";

      if(!sb){
        msg.textContent="Setup required: configure Supabase in config.js.";
        btn.disabled=false;
        return;
      }

      const fd=new FormData(form);
      const {error}=await sb.auth.signInWithPassword({
        email:fd.get("email"),
        password:fd.get("password")
      });

      if(error){
        msg.textContent="Sign-in failed. Check your credentials and Supabase setup.";
        btn.disabled=false;
        return;
      }

      const {data:{user}}=await sb.auth.getUser();
      const {data:profile,error:pe}=await sb.from("profiles")
        .select("role").eq("id",user.id).single();

      if(pe||profile?.role!=="admin"){
        await sb.auth.signOut();
        msg.textContent="This account is not authorized for admin access.";
        btn.disabled=false;
        return;
      }

      location.href="admin.html";
    });
  }

  // COUPONS
  let editingCouponId=null;

  function resetCouponForm(){
    const form=$("#coupon-form");
    if(!form)return;
    form.reset();
    if(form.elements.id)form.elements.id.value="";
    if(form.elements.min_order_amount)form.elements.min_order_amount.value="0";
    editingCouponId=null;
    const button=form.querySelector('button[type="submit"]');
    if(button)button.textContent="Save Coupon";
  }

  async function loadCoupons(){
    const body=$("#coupon-admin-list");
    if(!body)return;

    body.innerHTML='<tr><td colspan="7">Loading coupons…</td></tr>';

    const {data,error}=await sb.from("coupons").select("*").order("code");

    if(error){
      body.innerHTML=`<tr><td colspan="7">Could not load coupons: ${esc(error.message)}</td></tr>`;
      return;
    }

    const coupons=data||[];

    body.innerHTML=coupons.length?coupons.map(c=>`
      <tr>
        <td><strong>${esc(c.code)}</strong></td>
        <td>${c.discount_type==="percent"?`${Number(c.discount_value)}%`:money(c.discount_value)}</td>
        <td>${money(c.min_order_amount)}</td>
        <td>${Number(c.used_count||0)} / ${c.max_uses??"Unlimited"}</td>
        <td>${c.expires_at?esc(new Date(c.expires_at).toLocaleDateString()):"No expiry"}</td>
        <td>${c.is_active?"Active":"Inactive"}</td>
        <td>
          <button type="button" class="text-button" data-coupon-edit="${esc(c.id)}">Edit</button>
          <button type="button" class="text-button" data-coupon-toggle="${esc(c.id)}" data-active="${c.is_active}">
            ${c.is_active?"Disable":"Enable"}
          </button>
        </td>
      </tr>
    `).join(""):'<tr><td colspan="7">No coupons created yet.</td></tr>';

    body.onclick=async e=>{
      const edit=e.target.closest("[data-coupon-edit]");
      const toggle=e.target.closest("[data-coupon-toggle]");

      if(edit){
        const c=coupons.find(x=>String(x.id)===edit.dataset.couponEdit);
        if(!c)return;
        const form=$("#coupon-form");
        if(!form)return;

        editingCouponId=c.id;
        form.elements.id.value=c.id;
        form.elements.code.value=c.code||"";
        form.elements.discount_type.value=c.discount_type||"percent";
        form.elements.discount_value.value=c.discount_value??"";
        form.elements.min_order_amount.value=c.min_order_amount??0;
        form.elements.max_uses.value=c.max_uses??"";

        if(c.expires_at){
          const d=new Date(c.expires_at);
          d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
          form.elements.expires_at.value=d.toISOString().slice(0,16);
        }else{
          form.elements.expires_at.value="";
        }

        form.querySelector('button[type="submit"]').textContent="Update Coupon";
        form.scrollIntoView({behavior:"smooth",block:"start"});
      }

      if(toggle){
        const active=toggle.dataset.active==="true";
        toggle.disabled=true;
        const {error}=await sb.from("coupons")
          .update({is_active:!active}).eq("id",toggle.dataset.couponToggle);
        if(error)toast(error.message);
        else toast("Coupon status updated.");
        await loadCoupons();
      }
    };
  }

  async function saveCoupon(e){
    e.preventDefault();
    const form=e.currentTarget;
    const button=form.querySelector('button[type="submit"]');

    const code=String(form.elements.code.value||"").trim().toUpperCase();
    const type=form.elements.discount_type.value;
    const value=Number(form.elements.discount_value.value);
    const minimum=Number(form.elements.min_order_amount.value);
    const maxRaw=String(form.elements.max_uses.value||"").trim();
    const expiryRaw=form.elements.expires_at.value;

    if(!/^[A-Z0-9_-]{2,30}$/.test(code)){
      toast("Coupon code: use 2-30 letters, numbers, hyphens or underscores.");
      return;
    }
    if(!["percent","fixed"].includes(type)){
      toast("Select a valid discount type.");
      return;
    }
    if(!Number.isFinite(value)||value<=0||(type==="percent"&&value>100)){
      toast("Enter a valid discount. Percentage cannot exceed 100.");
      return;
    }
    if(!Number.isFinite(minimum)||minimum<0){
      toast("Enter a valid minimum order amount.");
      return;
    }

    const maxUses=maxRaw===""?null:Number(maxRaw);
    if(maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1)){
      toast("Maximum uses must be a positive whole number.");
      return;
    }

    let expiry=null;
    if(expiryRaw){
      const parsed=new Date(expiryRaw);
      if(Number.isNaN(parsed.getTime())||parsed<=new Date()){
        toast("Expiry date must be in the future.");
        return;
      }
      expiry=parsed.toISOString();
    }

    const record={
      code,discount_type:type,discount_value:value,
      min_order_amount:minimum,max_uses:maxUses,expires_at:expiry
    };

    button.disabled=true;
    try{
      const result=editingCouponId
        ? await sb.from("coupons").update(record).eq("id",editingCouponId)
        : await sb.from("coupons").insert({...record,is_active:true});

      if(result.error)throw result.error;
      toast(editingCouponId?"Coupon updated.":"Coupon created.");
      resetCouponForm();
      await loadCoupons();
    }catch(err){
      toast(err.message||"Could not save coupon.");
    }finally{
      button.disabled=false;
    }
  }

  // PRODUCT MEDIA
  let currentProductMedia=[];

  function ensureMediaManager(){
    let box=$("#product-media-manager");
    if(box)return box;

    const videoInput=$('input[name="media_video"]');
    if(!videoInput)return null;
    const label=videoInput.closest("label");
    if(!label)return null;

    box=document.createElement("div");
    box.id="product-media-manager";
    box.className="full";
    box.style.cssText="margin-top:16px;padding:16px;border:1px solid #ddd;border-radius:12px;";
    box.innerHTML="<h3>Existing Product Media</h3><p class='small muted'>Save the product first to manage its media.</p>";
    label.insertAdjacentElement("afterend",box);
    return box;
  }

  async function loadProductMedia(productId){
    const box=ensureMediaManager();
    if(!box)return;

    if(!productId){
      currentProductMedia=[];
      box.innerHTML="<h3>Existing Product Media</h3><p class='small muted'>Save the product first to manage its media.</p>";
      return;
    }

    box.innerHTML="<h3>Existing Product Media</h3><p>Loading media...</p>";

    const {data,error}=await sb.from("product_media")
      .select("id,product_id,media_type,storage_path,media_url,sort_order")
      .eq("product_id",productId).order("sort_order");

    if(error){
      box.innerHTML=`<h3>Existing Product Media</h3><p class="notice">Could not load media: ${esc(error.message)}</p>`;
      return;
    }

    currentProductMedia=data||[];

    if(!currentProductMedia.length){
      box.innerHTML="<h3>Existing Product Media</h3><p class='small muted'>No additional media uploaded yet.</p>";
      return;
    }

    box.innerHTML=`
      <h3>Existing Product Media</h3>
      <div class="media-admin-grid">
        ${currentProductMedia.map(item=>{
          const url=item.media_url||sb.storage.from("product-media").getPublicUrl(item.storage_path).data.publicUrl;
          return `
            <div class="media-admin-item" style="border:1px solid #ddd;padding:10px;border-radius:10px;">
              ${item.media_type==="image"
                ? `<img src="${esc(url)}" alt="Product image" style="width:100%;height:140px;object-fit:cover;border-radius:8px;">`
                : `<video src="${esc(url)}" controls style="width:100%;max-height:180px;"></video>`}
              <p class="small">${item.media_type==="image"?"Image":"Video"}</p>
              <button type="button" class="text-button danger" data-media-delete="${esc(item.id)}">Delete</button>
            </div>`;
        }).join("")}
      </div>`;

    box.onclick=async e=>{
      const button=e.target.closest("[data-media-delete]");
      if(!button)return;

      const item=currentProductMedia.find(x=>String(x.id)===button.dataset.mediaDelete);
      if(!item)return;
      if(!confirm("Delete this media file permanently?"))return;

      button.disabled=true;
      const {error:storageError}=await sb.storage.from("product-media").remove([item.storage_path]);

      if(storageError){
        toast("Could not delete media file: "+storageError.message);
        button.disabled=false;
        return;
      }

      const {error:dbError}=await sb.from("product_media").delete().eq("id",item.id);
      if(dbError){
        toast("File deleted, but its database record could not be deleted.");
        button.disabled=false;
        return;
      }

      toast("Media deleted.");
      await loadProductMedia(productId);
    };
  }

  // SAVE PRODUCT INCLUDING OPTIONAL SIZES
  async function saveProduct(e){
    e.preventDefault();

    const form=e.currentTarget;
    const btn=$('button[type="submit"]',form);
    btn.disabled=true;

    let mainImagePath=null;
    let productSaved=false;

    try{
      const fd=new FormData(form);
      let id=String(fd.get("id")||"").trim()||null;

      const title=String(fd.get("title")||"").trim();
      const price=Number(fd.get("price"));
      const sale=fd.get("sale_price")===""?null:Number(fd.get("sale_price"));

      if(!title||!Number.isFinite(price)||price<0)
        throw new Error("Enter a valid title and price.");

      if(sale!==null&&(!Number.isFinite(sale)||sale<0))
        throw new Error("Enter a valid sale price.");

      const sizes=String(fd.get("sizes")||"")
        .split(",")
        .map(x=>x.trim())
        .filter(Boolean)
        .filter((x,i,a)=>a.indexOf(x)===i);

      const mainFile=fd.get("image");
      const images=[...(form.elements.media_images?.files||[])];
      const video=form.elements.media_video?.files?.[0]||null;

      if(images.length>10)throw new Error("Maximum 10 additional images can be selected.");

      for(const file of images){
        if(file.size>5*1024*1024)throw new Error(`${file.name} is larger than 5 MB.`);
        if(!["image/jpeg","image/png","image/webp"].includes(file.type))
          throw new Error("Additional images must be JPG, PNG or WebP.");
      }

      if(video){
        if(video.size>50*1024*1024)throw new Error("Video must be 50 MB or smaller.");
        if(!["video/mp4","video/webm"].includes(video.type))
          throw new Error("Video must be MP4 or WebM.");
      }

      let image_path=null;
      let image_url=String(fd.get("image_url")||"").trim()||null;

      if(mainFile&&mainFile.size){
        if(mainFile.size>5*1024*1024)throw new Error("Main image must be 5 MB or smaller.");
        if(!["image/jpeg","image/png","image/webp"].includes(mainFile.type))
          throw new Error("Main image must be JPG, PNG or WebP.");

        mainImagePath=`${crypto.randomUUID()}-${slug(mainFile.name)}`;
        const upload=await sb.storage.from("product-images").upload(mainImagePath,mainFile,{
          upsert:false,contentType:mainFile.type
        });
        if(upload.error)throw upload.error;

        image_path=mainImagePath;
        image_url=null;
      }else if(id){
        const old=await sb.from("products").select("image_path,image_url").eq("id",id).single();
        if(old.error)throw old.error;
        image_path=old.data.image_path||null;
        if(!image_url)image_url=old.data.image_url||null;
      }

      const payload={
        title,
        slug:slug(title),
        price,
        sale_price:sale,
        category_id:fd.get("category_id")||null,
        stock:Math.max(0,Number(fd.get("stock")||0)),
        sku:String(fd.get("sku")||"").trim()||null,
        short_description:String(fd.get("short_description")||"").trim()||null,
        description:String(fd.get("description")||"").trim()||null,
        image_path,
        image_url,
        sizes,
        is_featured:fd.get("is_featured")==="on",
        is_published:fd.get("is_published")==="on",
        updated_at:new Date().toISOString()
      };

      const result=id
        ? await sb.from("products").update(payload).eq("id",id).select("id").single()
        : await sb.from("products").insert(payload).select("id").single();

      if(result.error)throw result.error;

      id=result.data.id;
      productSaved=true;
      form.elements.id.value=id;

      const existing=await sb.from("product_media")
        .select("id,media_type").eq("product_id",id);

      if(existing.error)throw existing.error;

      const oldMedia=existing.data||[];
      const oldImages=oldMedia.filter(x=>x.media_type==="image").length;
      const oldVideos=oldMedia.filter(x=>x.media_type==="video").length;

      if(oldImages+images.length>10)
        throw new Error("Maximum 10 additional images allowed. Delete old images first.");
      if(video&&oldVideos>=1)
        throw new Error("A video already exists. Delete the old video first.");

      const rows=[];
      const uploadedPaths=[];
      let order=oldMedia.length;

      try{
        for(const file of images){
          const path=`${id}/${crypto.randomUUID()}-${slug(file.name)}`;
          const upload=await sb.storage.from("product-media").upload(path,file,{
            upsert:false,contentType:file.type
          });
          if(upload.error)throw upload.error;
          uploadedPaths.push(path);

          const url=sb.storage.from("product-media").getPublicUrl(path).data.publicUrl;
          rows.push({
            product_id:id,media_type:"image",
            storage_path:path,media_url:url,sort_order:order++
          });
        }

        if(video){
          const path=`${id}/${crypto.randomUUID()}-${slug(video.name)}`;
          const upload=await sb.storage.from("product-media").upload(path,video,{
            upsert:false,contentType:video.type
          });
          if(upload.error)throw upload.error;
          uploadedPaths.push(path);

          const url=sb.storage.from("product-media").getPublicUrl(path).data.publicUrl;
          rows.push({
            product_id:id,media_type:"video",
            storage_path:path,media_url:url,sort_order:order
          });
        }

        if(rows.length){
          const {error}=await sb.from("product_media").insert(rows);
          if(error)throw error;
        }
      }catch(mediaError){
        if(uploadedPaths.length)
          await sb.storage.from("product-media").remove(uploadedPaths);
        throw new Error("Product saved, but media upload failed: "+mediaError.message);
      }

      if(form.elements.media_images)form.elements.media_images.value="";
      if(form.elements.media_video)form.elements.media_video.value="";

      await loadProductMedia(id);
      form.classList.add("hidden");
      toast("Product and media saved successfully.");
      await loadAdminProducts();
      await loadStats();

    }catch(err){
      if(!productSaved&&mainImagePath)
        await sb.storage.from("product-images").remove([mainImagePath]);

      toast(err.message||"Could not save product.");
    }finally{
      btn.disabled=false;
    }
  }

  // ADMIN DASHBOARD
  async function adminInit(){
    if(!$("#admin-products"))return;

    const user=await requireAdmin();
    if(!user)return;

    $("#admin-user").textContent=user.email||"Administrator";

    $("#logout-btn")?.addEventListener("click",async()=>{
      await sb.auth.signOut();
      location.href="admin-login.html";
    });

    $$(".tab-btn").forEach(b=>b.addEventListener("click",()=>{
      $$(".tab-btn").forEach(x=>x.classList.toggle("active",x===b));
      $$(".admin-tab").forEach(x=>x.classList.toggle("hidden",x.id!==`tab-${b.dataset.tab}`));

      if(b.dataset.tab==="orders")loadOrders();
      if(b.dataset.tab==="categories")loadCategories();
      if(b.dataset.tab==="coupons")loadCoupons();
      if(b.dataset.tab==="analytics")loadAnalytics();
      if(b.dataset.tab==="reviews")loadReviews();
    }));

    $("#new-product-btn").onclick=()=>{
      const f=$("#product-form");
      f.reset();
      f.elements.id.value="";
      f.classList.remove("hidden");
      loadProductMedia(null);
    };

    $("#cancel-product-btn").onclick=()=>{
      $("#product-form").classList.add("hidden");
    };

    $("#product-form").addEventListener("submit",saveProduct);
    $("#category-form").addEventListener("submit",saveCategory);
    $("#coupon-form")?.addEventListener("submit",saveCoupon);
    $("#cancel-coupon")?.addEventListener("click",resetCouponForm);
    $("#refresh-orders").onclick=loadOrders;

    $("#refresh-analytics")?.addEventListener("click",loadAnalytics);
    $("#refresh-reviews")?.addEventListener("click",loadReviews);

    $$(".analytics-filter [data-period]").forEach(button=>{
      button.addEventListener("click",()=>{
        $$(".analytics-filter [data-period]").forEach(x=>x.classList.toggle("active",x===button));
        analyticsPeriod=Number(button.dataset.period);
        loadAnalytics();
      });
    });

    await loadProductMedia(null);
    await loadCategories();
    await loadAdminProducts();
    await loadStats();
    await loadOrders();
  }

  async function loadStats(){
    const [p,o,d]=await Promise.all([
      sb.from("products").select("id",{count:"exact",head:true}),
      sb.from("orders").select("id",{count:"exact",head:true}),
      sb.from("orders").select("total")
        .eq("order_status","delivered").eq("payment_status","collected")
    ]);

    const pending=await sb.from("orders").select("id",{count:"exact",head:true})
      .in("order_status",["pending_confirmation","confirmed","processing"]);

    const revenue=(d.data||[]).reduce((n,x)=>n+Number(x.total||0),0);

    $("#admin-stats").innerHTML=`
      <div class="stat-card"><span>Products</span><strong>${p.count??"—"}</strong></div>
      <div class="stat-card"><span>Total orders</span><strong>${o.count??"—"}</strong></div>
      <div class="stat-card"><span>Pending orders</span><strong>${pending.count??"—"}</strong></div>
      <div class="stat-card"><span>Collected delivered sales</span><strong>${money(revenue)}</strong></div>
    `;
  }

  async function loadAdminProducts(){
    const body=$("#admin-products");

    const {data,error}=await sb.from("products")
      .select("id,title,price,sale_price,stock,is_published,image_url,image_path,description,short_description,sku,category_id,is_featured,sizes")
      .order("created_at",{ascending:false});

    if(error){
      body.innerHTML='<tr><td colspan="5">Could not load products. Check RLS policies.</td></tr>';
      return;
    }

    body.innerHTML=data.length?data.map(p=>`
      <tr>
        <td>
          <div class="table-product">
            ${p.image_url||p.image_path?`<img src="${esc(imageOf(p))}" alt="">`:""}
            <span>${esc(p.title)}</span>
          </div>
        </td>
        <td>${money(productPrice(p))}</td>
        <td>${p.stock}</td>
        <td><span class="status-pill">${p.is_published?"Published":"Draft"}</span></td>
        <td>
          <div class="action-row">
            <button class="text-button" data-edit="${esc(p.id)}">Edit</button>
            <button class="text-button danger" data-delete="${esc(p.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join(""):'<tr><td colspan="5">No products yet. Add your first product.</td></tr>';

    body.onclick=async e=>{
      const edit=e.target.closest("[data-edit]");
      const del=e.target.closest("[data-delete]");

      if(edit){
        const p=data.find(x=>x.id===edit.dataset.edit);
        const f=$("#product-form");
        if(!p||!f)return;

        Object.entries(p).forEach(([k,v])=>{
          if(f.elements[k]){
            if(f.elements[k].type==="checkbox")f.elements[k].checked=!!v;
            else if(k==="sizes")f.elements[k].value=normalizeSizes(v).join(", ");
            else f.elements[k].value=v??"";
          }
        });

        if(f.elements.sizes)f.elements.sizes.value=normalizeSizes(p.sizes).join(", ");
        f.elements.image.value="";
        f.classList.remove("hidden");
        await loadProductMedia(p.id);

        window.scrollTo({top:f.offsetTop-80,behavior:"smooth"});
      }

      if(del&&confirm("Delete this product? Historical order items remain saved.")){
        const {error}=await sb.from("products").delete().eq("id",del.dataset.delete);
        if(error){
          toast("Could not delete product. It may be referenced by an order.");
        }else{
          toast("Product deleted.");
          loadAdminProducts();
          loadStats();
        }
      }
    };
  }

  async function loadCategories(){
    const {data,error}=await sb.from("categories").select("id,name").order("name");

    if(error){
      const list=$("#category-admin-list");
      if(list)list.textContent="Could not load categories.";
      return;
    }

    const sel=$("#product-category");
    if(sel){
      sel.innerHTML='<option value="">Uncategorized</option>'+
        (data||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    }

    const list=$("#category-admin-list");
    if(list){
      list.innerHTML=data.length
        ? data.map(c=>`
          <div class="category-admin-row">
            <span>${esc(c.name)}</span>
            <button class="text-button danger" data-cat-delete="${esc(c.id)}">Delete</button>
          </div>
        `).join("")
        : "No categories yet.";
    }

    if(list)list.onclick=async e=>{
      const b=e.target.closest("[data-cat-delete]");
      if(b&&confirm("Delete this category? Products will need a different category.")){
        const {error}=await sb.from("categories").delete().eq("id",b.dataset.catDelete);
        if(error)toast("Could not delete category. It may still be assigned to products.");
        else{
          toast("Category deleted.");
          loadCategories();
        }
      }
    };
  }

  async function saveCategory(e){
    e.preventDefault();
    const name=String(new FormData(e.currentTarget).get("name")).trim();
    if(!name)return;

    const {error}=await sb.from("categories").insert({name,slug:slug(name)});
    if(error)toast("Could not add category. It may already exist.");
    else{
      e.currentTarget.reset();
      toast("Category added.");
      loadCategories();
    }
  }

  const statusLabels={
    pending_confirmation:"Pending confirmation",
    confirmed:"Confirmed",
    processing:"Processing",
    shipped:"Shipped",
    out_for_delivery:"Out for delivery",
    delivered:"Delivered",
    cancelled:"Cancelled",
    returned:"Returned"
  };

  async function loadOrders(){
    const body=$("#admin-orders");
    if(!body)return;

    const {data,error}=await sb.from("orders")
      .select("*").order("created_at",{ascending:false}).limit(200);

    if(error){
      body.innerHTML='<tr><td colspan="7">Could not load orders. Check database policies.</td></tr>';
      return;
    }

    body.innerHTML=data.length?data.map(o=>`
      <tr>
        <td><strong>${esc(o.order_number)}</strong><br><small>${new Date(o.created_at).toLocaleString()}</small></td>
        <td>${esc(o.customer_name)}<br><small>${esc(o.customer_phone)}</small></td>
        <td>${money(o.total)}</td>
        <td>${esc(o.payment_status)}</td>
        <td><span class="status-pill">${esc(statusLabels[o.order_status]||o.order_status)}</span></td>
        <td>
          <select class="status-select" data-status-id="${esc(o.id)}" aria-label="Update order status">
            ${Object.entries(statusLabels).map(([v,l])=>
              `<option value="${v}" ${o.order_status===v?"selected":""}>${l}</option>`
            ).join("")}
          </select>
        </td>
        <td><button class="text-button" data-order-detail="${esc(o.id)}">View</button></td>
      </tr>
    `).join(""):'<tr><td colspan="7">No orders received yet.</td></tr>';

    body.onchange=async e=>{
      const s=e.target.closest("[data-status-id]");
      if(!s)return;

      const old=data.find(o=>o.id===s.dataset.statusId);
      const note=prompt("Optional note for status history:")||null;

      const {error}=await sb.from("orders").update({order_status:s.value}).eq("id",s.dataset.statusId);
      if(error){
        toast("Could not update order.");
        return;
      }

      const {error:he}=await sb.from("order_status_history").insert({
        order_id:s.dataset.statusId,
        previous_status:old?.order_status||null,
        new_status:s.value,
        note
      });

      if(he)toast("Status updated, but history insert failed. Check SQL setup.");
      else toast("Order status updated.");

      loadOrders();
      loadStats();
    };

    body.onclick=async e=>{
      const b=e.target.closest("[data-order-detail]");
      if(!b)return;

      const o=data.find(x=>x.id===b.dataset.orderDetail);
      if(!o)return;

      const {data:items,error:ie}=await sb.from("order_items")
        .select("*").eq("order_id",o.id);

      const detail=$("#order-detail");
      if(!detail)return;
      detail.classList.remove("hidden");

      detail.innerHTML=`
        <div class="admin-section-heading">
          <h2>Order ${esc(o.order_number)}</h2>
          <button class="btn btn-outline btn-small" id="close-order-detail">Close</button>
        </div>

        <div class="detail-grid">
          <div>
            <h3>Customer</h3>
            <p>
              ${esc(o.customer_name)}<br>
              ${esc(o.customer_phone)}<br>
              ${esc(o.customer_email||"")}
            </p>
            <p>${esc(o.delivery_address)}<br>${esc(o.city)}, ${esc(o.province)}</p>
          </div>
          <div>
            <h3>Payment and totals</h3>
            <p>
              Method: ${esc(o.payment_method)}<br>
              Payment status: ${esc(o.payment_status)}<br>
              Subtotal: ${money(o.subtotal)}<br>
              Shipping: ${money(o.shipping_fee)}<br>
              <strong>Total: ${money(o.total)}</strong>
            </p>
          </div>
        </div>

        <h3>Items</h3>
        ${ie?"Could not load items.":(items||[]).map(i=>`
          <div class="order-item-row">
            <span>
              ${esc(i.product_title)}
              ${i.selected_size?`(Size: ${esc(i.selected_size)})`:""}
              × ${i.quantity}
            </span>
            <strong>${money(i.line_total)}</strong>
          </div>
        `).join("")}

        <p class="small muted">Delivery instructions: ${esc(o.delivery_instructions||"None")}</p>
        <button id="mark-collected" class="btn btn-dark btn-small" data-id="${esc(o.id)}">
          Mark COD collected
        </button>
      `;

      $("#close-order-detail").onclick=()=>detail.classList.add("hidden");

      $("#mark-collected").onclick=async()=>{
        if(!confirm("Confirm that COD payment has been collected?"))return;

        const {error}=await sb.from("orders")
          .update({payment_status:"collected"}).eq("id",o.id);

        if(error)toast("Could not update payment status.");
        else{
          toast("Payment collection recorded.");
          loadOrders();
          loadStats();
        }
      };
    };
  }

  // =====================================================
  // SALES ANALYTICS
  // =====================================================

  let analyticsPeriod=30;

  function drawSalesChart(points){
    const canvas=$("#sales-chart");
    if(!canvas)return;

    const ctx=canvas.getContext("2d");
    const width=canvas.clientWidth||500;
    const height=260;
    const ratio=window.devicePixelRatio||1;

    canvas.width=width*ratio;
    canvas.height=height*ratio;
    canvas.style.height=height+"px";
    ctx.scale(ratio,ratio);
    ctx.clearRect(0,0,width,height);

    const pad={left:55,right:15,top:20,bottom:42};
    const chartW=width-pad.left-pad.right;
    const chartH=height-pad.top-pad.bottom;
    const max=Math.max(1,...points.map(x=>x.value));
    const steps=4;

    ctx.font="11px Arial";
    ctx.strokeStyle="#dedbd2";
    ctx.fillStyle="#777";
    ctx.lineWidth=1;

    for(let i=0;i<=steps;i++){
      const y=pad.top+(chartH/steps)*i;
      const val=max-(max/steps)*i;
      ctx.beginPath();
      ctx.moveTo(pad.left,y);
      ctx.lineTo(width-pad.right,y);
      ctx.stroke();
      ctx.textAlign="right";
      ctx.fillText(Math.round(val).toLocaleString(),pad.left-8,y+4);
    }

    if(!points.length)return;

    const step=points.length>1?chartW/(points.length-1):0;

    ctx.beginPath();
    points.forEach((p,i)=>{
      const x=pad.left+i*step;
      const y=pad.top+chartH-(p.value/max)*chartH;
      if(i===0)ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    ctx.strokeStyle="#b58b35";
    ctx.lineWidth=2.5;
    ctx.stroke();

    points.forEach((p,i)=>{
      const x=pad.left+i*step;
      const y=pad.top+chartH-(p.value/max)*chartH;

      ctx.beginPath();
      ctx.arc(x,y,3.5,0,Math.PI*2);
      ctx.fillStyle="#b58b35";
      ctx.fill();

      if(points.length<=15||i%Math.ceil(points.length/8)===0||i===points.length-1){
        ctx.fillStyle="#777";
        ctx.textAlign="center";
        ctx.fillText(p.label,x,height-15);
      }
    });
  }

  async function loadAnalytics(){
    const message=$("#analytics-message");
    if(!$("#tab-analytics"))return;

    if(message){
      message.classList.remove("hidden");
      message.textContent="Loading sales analytics...";
    }

    const start=new Date();
    start.setDate(start.getDate()-analyticsPeriod+1);
    start.setHours(0,0,0,0);

    const {data:orders,error}=await sb.from("orders")
      .select("id,total,subtotal,shipping_fee,discount,order_status,payment_status,created_at")
      .gte("created_at",start.toISOString())
      .order("created_at",{ascending:true});

    if(error){
      if(message)message.textContent="Analytics error: "+error.message;
      return;
    }

    const list=orders||[];
    const completed=list.filter(o=>
      o.order_status==="delivered"&&o.payment_status==="collected"
    );

    const revenue=completed.reduce((n,o)=>n+Number(o.total||0),0);
    const average=completed.length?revenue/completed.length:0;

    $("#analytics-revenue").textContent=money(revenue);
    $("#analytics-delivered").textContent=completed.length;
    $("#analytics-average").textContent=money(average);
    $("#analytics-orders").textContent=list.length;

    // Daily sales for periods up to 90 days; monthly for longer periods.
    const useMonthly=analyticsPeriod>90;
    const buckets={};

    completed.forEach(o=>{
      const d=new Date(o.created_at);
      const key=useMonthly
        ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

      buckets[key]=(buckets[key]||0)+Number(o.total||0);
    });

    const points=[];
    if(useMonthly){
      const count=Math.min(12,Math.ceil(analyticsPeriod/30));
      const d=new Date(start.getFullYear(),start.getMonth(),1);

      for(let i=0;i<count;i++){
        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        points.push({label:d.toLocaleDateString("en",{month:"short"}),value:buckets[key]||0});
        d.setMonth(d.getMonth()+1);
      }
    }else{
      for(let i=0;i<analyticsPeriod;i++){
        const d=new Date(start);
        d.setDate(start.getDate()+i);
        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        points.push({label:d.toLocaleDateString("en",{day:"numeric",month:"short"}),value:buckets[key]||0});
      }
    }

    drawSalesChart(points);

    // Order status breakdown
    const statuses={};
    list.forEach(o=>{
      const key=o.order_status||"unknown";
      statuses[key]=(statuses[key]||0)+1;
    });

    const statusBox=$("#analytics-status");
    if(statusBox){
      statusBox.innerHTML=Object.entries(statuses).length
        ? Object.entries(statuses).map(([key,count])=>`
          <div class="total-line">
            <span>${esc(statusLabels[key]||key)}</span>
            <strong>${count}</strong>
          </div>
        `).join("")
        : "<p>No orders in this period.</p>";
    }

    // Best-selling products among delivered and collected orders only.
    const completedIds=completed.map(o=>o.id);
    const productBox=$("#analytics-products");

    if(completedIds.length){
      const {data:items,error:itemError}=await sb.from("order_items")
        .select("product_title,quantity,line_total,order_id")
        .in("order_id",completedIds);

      if(itemError){
        productBox.textContent="Could not load product sales: "+itemError.message;
      }else{
        const totals={};

        (items||[]).forEach(item=>{
          const name=item.product_title||"Unknown product";
          if(!totals[name])totals[name]={quantity:0,revenue:0};
          totals[name].quantity+=Number(item.quantity||0);
          totals[name].revenue+=Number(item.line_total||0);
        });

        const best=Object.entries(totals)
          .sort((a,b)=>b[1].quantity-a[1].quantity)
          .slice(0,10);

        productBox.innerHTML=best.length?best.map(([name,data],index)=>`
          <div class="total-line">
            <span>${index+1}. ${esc(name)}<br><small>${data.quantity} units sold</small></span>
            <strong>${money(data.revenue)}</strong>
          </div>
        `).join(""):"<p>No completed product sales in this period.</p>";
      }
    }else{
      productBox.innerHTML="<p>No delivered and collected orders in this period.</p>";
    }

    if(message){
      message.textContent=`Showing the last ${analyticsPeriod} days. Revenue includes only delivered orders with collected payment.`;
    }
  }

  // =====================================================
  // CUSTOMER REVIEWS - ADMIN APPROVAL
  // =====================================================

  async function loadReviews(){
    const list=$("#admin-reviews-list");
    if(!list)return;

    list.innerHTML='<div class="panel">Loading reviews...</div>';

    const {data,error}=await sb.from("product_reviews")
      .select("id,product_id,order_id,rating,review_text,status,created_at,products(title)")
      .order("created_at",{ascending:false})
      .limit(300);

    if(error){
      list.innerHTML=`<div class="notice">Could not load reviews: ${esc(error.message)}</div>`;
      return;
    }

    const reviews=data||[];

    const counts={
      pending:reviews.filter(r=>r.status==="pending").length,
      approved:reviews.filter(r=>r.status==="approved").length,
      rejected:reviews.filter(r=>r.status==="rejected").length
    };

    if($("#reviews-pending-count"))$("#reviews-pending-count").textContent=counts.pending;
    if($("#reviews-approved-count"))$("#reviews-approved-count").textContent=counts.approved;
    if($("#reviews-rejected-count"))$("#reviews-rejected-count").textContent=counts.rejected;

    if(!reviews.length){
      list.innerHTML='<div class="panel">No customer reviews have been submitted yet.</div>';
      return;
    }

    list.innerHTML=reviews.map(r=>`
      <article class="review-card">
        <div class="review-stars">${"★".repeat(Number(r.rating)||0)}${"☆".repeat(5-(Number(r.rating)||0))}</div>
        <h3>${esc(r.products?.title||"Product")}</h3>
        <p>${esc(r.review_text)}</p>
        <p class="small muted">
          ${new Date(r.created_at).toLocaleString()} ·
          Order reference: ${esc(r.order_id)}
        </p>
        <p class="status-${esc(r.status)}">Status: ${esc(r.status)}</p>
        <div class="review-actions">
          ${r.status!=="approved"?`<button type="button" data-review-action="approved" data-review-id="${esc(r.id)}">Approve</button>`:""}
          ${r.status!=="rejected"?`<button type="button" data-review-action="rejected" data-review-id="${esc(r.id)}">Reject</button>`:""}
          <button type="button" data-review-delete="${esc(r.id)}">Delete</button>
        </div>
      </article>
    `).join("");

    list.onclick=async e=>{
      const action=e.target.closest("[data-review-action]");
      const del=e.target.closest("[data-review-delete]");

      if(action){
        const id=action.dataset.reviewId;
        const status=action.dataset.reviewAction;

        if(!confirm(`Are you sure you want to ${status} this review?`))return;

        action.disabled=true;

        const {error:updateError}=await sb.from("product_reviews")
          .update({status}).eq("id",id);

        if(updateError){
          toast("Could not update review: "+updateError.message);
          action.disabled=false;
          return;
        }

        toast(`Review ${status}.`);
        await loadReviews();
      }

      if(del){
        if(!confirm("Permanently delete this review?"))return;

        del.disabled=true;

        const {error:deleteError}=await sb.from("product_reviews")
          .delete().eq("id",del.dataset.reviewDelete);

        if(deleteError){
          toast("Could not delete review: "+deleteError.message);
          del.disabled=false;
          return;
        }

        toast("Review deleted.");
        await loadReviews();
      }
    };
  }

  document.addEventListener("DOMContentLoaded",()=>{
    updateCartCount();

    const path=location.pathname.split("/").pop()||"index.html";

    if(path==="index.html")renderHome();
    if(path==="cart.html")renderCart();
    if(path==="checkout.html")renderCheckout();
    if(path==="admin-login.html")loginAdmin();
    if(path==="admin.html")adminInit();

    const year=$("#year");
    if(year)year.textContent=new Date().getFullYear();

    document.body.addEventListener("click",e=>{
      const b=e.target.closest(".add-cart");
      if(b)addProductToCart(b.dataset.id);
    });
  });
})();
