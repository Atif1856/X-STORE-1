
(() => {
  "use strict";

  const cfg = window.XSTORE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const money = n =>
    `${cfg.CURRENCY || "PKR"} ${Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

  let toastTimer;

  const toast = msg => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
  };

  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    String(cfg.SUPABASE_URL).startsWith("https://") &&
    !String(cfg.SUPABASE_URL).includes("PASTE_") &&
    !String(cfg.SUPABASE_ANON_KEY).includes("PASTE_");

  const sb = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const form = $("#xs-checkout-form");
  const layout = $(".checkout-layout");

  if (!form || !layout) return;

  const submitBtn = $("#xs-submit");
  const couponInput = $("#xs-coupon");
  const couponBtn = $("#xs-coupon-btn");
  const cityInput = form.elements.city;
  const provinceInput = form.elements.province;

  const readCart = () => {
    try {
      const c = JSON.parse(localStorage.getItem("xstore_cart") || "[]");
      return Array.isArray(c) ? c : [];
    } catch {
      return [];
    }
  };

  const cartItems = () => readCart()
    .filter(x => x && x.id && Number(x.qty) > 0)
    .map(x => ({ id: String(x.id), qty: Math.floor(Number(x.qty)) }));

  let appliedCode = "";
  let busy = false;
  let quoteBusy = false;

  const showError = msg => {
    const el = $("#xs-form-error");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  };

  const setCouponMsg = (text, ok) => {
    const el = $("#xs-coupon-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "coupon-msg" + (text ? (ok ? " ok" : " bad") : "");
  };

  function renderQuote(q) {
    $("#xs-summary-lines").innerHTML = (q.lines || []).map(l =>
      `<div class="sum-line"><span>${esc(l.title)} × ${Number(l.quantity)}</span><strong>${money(l.line_total)}</strong></div>`
    ).join("");

    const disc = Number(q.discount || 0);

    $("#xs-totals").innerHTML =
      `<div class="total-line"><span>Subtotal</span><strong>${money(q.subtotal)}</strong></div>` +
      (disc > 0
        ? `<div class="total-line"><span>Discount${q.coupon_code ? " (" + esc(q.coupon_code) + ")" : ""}</span><strong class="discount-text">− ${money(disc)}</strong></div>`
        : "") +
      `<div class="total-line"><span>Shipping</span><strong>${money(q.shipping_fee)}</strong></div>` +
      `<div class="total-line grand-total"><span>Total</span><strong>${money(q.total)}</strong></div>`;

    $("#xs-total-inline").innerHTML =
      `Amount to pay on delivery: <strong>${money(q.total)}</strong>`;
  }

  async function loadQuote(code) {
    const city = cityInput.value.trim();
    const province = provinceInput.value.trim();

    if (!city || !province) {
      throw new Error("Please enter your city and province.");
    }

    const { data, error } = await sb.rpc("quote_order", {
      p_items: cartItems(),
      p_coupon: code || null,
      p_city: city,
      p_province: province
    });

    if (error) throw error;
    return data;
  }

  async function refreshQuote() {
    if (quoteBusy || busy) return;

    quoteBusy = true;
    submitBtn.disabled = true;

    try {
      const q = await loadQuote(appliedCode);
      renderQuote(q);
      showError("");
      setCouponMsg(
        appliedCode ? `Coupon applied. You save ${money(q.discount)}.` : "",
        true
      );
      submitBtn.disabled = false;
    } catch (err) {
      $("#xs-totals").innerHTML = "";
      $("#xs-total-inline").textContent = "";
      showError(err.message || "Could not calculate delivery charges.");
      submitBtn.disabled = true;
    } finally {
      quoteBusy = false;
    }
  }

  async function applyCoupon() {
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
      setCouponMsg("Enter a coupon code first.", false);
      return;
    }

    couponBtn.disabled = true;

    try {
      const q = await loadQuote(code);

      if (q.coupon_valid) {
        appliedCode = q.coupon_code;
        couponInput.value = q.coupon_code;
        couponInput.readOnly = true;
        couponBtn.textContent = "Remove";
        setCouponMsg("Coupon applied. You save " + money(q.discount) + ".", true);
      } else {
        appliedCode = "";
        setCouponMsg(q.coupon_message || "This coupon is not valid.", false);
      }

      renderQuote(q);
    } catch (err) {
      setCouponMsg(err.message || "Could not check the coupon.", false);
    } finally {
      couponBtn.disabled = false;
    }
  }

  async function removeCoupon() {
    appliedCode = "";
    couponInput.value = "";
    couponInput.readOnly = false;
    couponBtn.textContent = "Apply";
    setCouponMsg("", true);
    await refreshQuote();
  }

  function showSuccess(order) {
    const wrap = document.createElement("div");
    wrap.className = "xs-modal";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "xs-modal-title");

    wrap.innerHTML =
      `<div class="xs-modal-card"><div class="xs-check">✓</div><h2 id="xs-modal-title">Order placed!</h2>` +
      `<p>Thank you for shopping with X STORE. We will contact you to confirm your order.</p>` +
      `<div class="xs-order-no">${esc(order.order_number)}</div>` +
      `<div class="xs-modal-total"><span>Pay on delivery</span><strong>${money(order.total)}</strong></div>` +
      `<p class="small muted">Save your order number. Use it with your phone number to track your order.</p>` +
      `<button type="button" class="btn btn-dark btn-block" id="xs-modal-ok">Continue</button></div>`;

    document.body.appendChild(wrap);

    const go = () => {
      location.href = "order-success.html";
    };

    $("#xs-modal-ok").addEventListener("click", go);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") go();
    });
    $("#xs-modal-ok").focus();
  }

  couponBtn.addEventListener("click", () => {
    appliedCode ? removeCoupon() : applyCoupon();
  });

  couponInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!appliedCode) applyCoupon();
    }
  });

  cityInput.addEventListener("change", refreshQuote);
  provinceInput.addEventListener("change", refreshQuote);

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (busy || quoteBusy) return;

    showError("");

    const items = cartItems();

    if (!items.length) {
      showError("Your cart is empty.");
      return;
    }

    if (couponInput.value.trim() && !appliedCode) {
      showError("Click Apply to use your coupon, or clear the coupon box.");
      return;
    }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order…";

    const fd = new FormData(form);
    const g = k => String(fd.get(k) || "").trim();

    const customer = {
      full_name: g("full_name"),
      phone: g("phone"),
      phone_2: g("phone_2"),
      email: g("email"),
      address: g("address"),
      area: g("area"),
      city: g("city"),
      province: g("province"),
      postal_code: g("postal_code"),
      landmark: g("landmark"),
      instructions: g("instructions")
    };

    try {
      const { data, error } = await sb.rpc("place_cod_order", {
        p_customer: customer,
        p_items: items,
        p_coupon: appliedCode || null
      });

      if (error) throw error;

      sessionStorage.setItem("xstore_last_order", data.order_number);
      localStorage.setItem("xstore_cart", "[]");
      showSuccess(data);

    } catch (err) {
      showError(err.message || "Could not place your order. Please try again.");
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Place COD order";
    }
  });

  async function init() {
    if (!sb) {
      layout.innerHTML = '<div class="notice">The store is not configured yet. Please try again later.</div>';
      return;
    }

    if (!cartItems().length) {
      layout.innerHTML = '<div class="notice">Your cart is empty. <a href="index.html#shop">Shop products</a></div>';
      return;
    }

    await refreshQuote();
  }

  init();
})();
