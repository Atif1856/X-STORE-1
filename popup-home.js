
(function () {
  const config = window.XSTORE_CONFIG;

  if (!window.supabase || !config) return;

  const sb = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  const STORAGE_KEY = "xstore_popup_last_shown";

  // -----------------------------
  // Popup Design
  // -----------------------------

  const style = document.createElement("style");

  style.textContent = `
    .xstore-popup-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(5px);
    }

    .xstore-popup-overlay.is-visible {
      display: flex;
    }

    .xstore-popup-box {
      position: relative;
      width: 100%;
      max-width: 440px;
      padding: 38px 28px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 20px 70px rgba(0,0,0,.3);
      animation: xstorePopupIn .35s ease;
    }

    .xstore-popup-close {
      position: absolute;
      top: 10px;
      right: 14px;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 27px;
      cursor: pointer;
    }

    .xstore-popup-heading {
      margin: 0 25px 14px;
      font-size: 27px;
      line-height: 1.25;
    }

    .xstore-popup-message {
      font-size: 15px;
      line-height: 1.7;
      margin: 0 0 20px;
    }

    .xstore-popup-coupon {
      display: inline-block;
      padding: 12px 20px;
      margin: 5px 0 22px;
      border: 1px dashed currentColor;
      border-radius: 8px;
      font-weight: 700;
      letter-spacing: 2px;
      font-size: 18px;
    }

    .xstore-popup-action {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border: 0;
      border-radius: 7px;
      background: #c5a46d;
      color: #171717;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }

    .xstore-popup-action:hover {
      opacity: .9;
    }

    .xstore-popup-note {
      margin: 14px 0 0;
      font-size: 11px;
      opacity: .7;
    }

    @keyframes xstorePopupIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media(max-width:480px) {
      .xstore-popup-box {
        padding: 35px 22px;
      }

      .xstore-popup-heading {
        font-size: 23px;
      }
    }
  `;

  document.head.appendChild(style);

  // -----------------------------
  // Create Popup HTML
  // -----------------------------

  const overlay = document.createElement("div");

  overlay.className = "xstore-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Store promotion");

  const box = document.createElement("div");
  box.className = "xstore-popup-box";

  const closeButton = document.createElement("button");
  closeButton.className = "xstore-popup-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close popup");
  closeButton.textContent = "×";

  const heading = document.createElement("h2");
  heading.className = "xstore-popup-heading";

  const message = document.createElement("p");
  message.className = "xstore-popup-message";

  const coupon = document.createElement("div");
  coupon.className = "xstore-popup-coupon";

  const action = document.createElement("button");
  action.className = "xstore-popup-action";
  action.type = "button";

  const note = document.createElement("p");
  note.className = "xstore-popup-note";
  note.textContent = "Offer subject to coupon terms and conditions.";

  box.append(
    closeButton,
    heading,
    message,
    coupon,
    action,
    note
  );

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // -----------------------------
  // Close Popup
  // -----------------------------

  function closePopup() {
    overlay.classList.remove("is-visible");
  }

  closeButton.addEventListener("click", closePopup);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closePopup();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      overlay.classList.contains("is-visible")
    ) {
      closePopup();
    }
  });

  // -----------------------------
  // Load Popup Settings
  // -----------------------------

  async function loadPopup() {
    try {
      const { data, error } = await sb
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "first_order_popup")
        .maybeSingle();

      if (error) throw error;

      const settings = data?.setting_value;

      if (!settings || settings.enabled !== true) return;

      const frequency = Math.min(
        365,
        Math.max(1, Number(settings.frequency) || 7)
      );

      const lastShown = Number(
        localStorage.getItem(STORAGE_KEY) || 0
      );

      const now = Date.now();
      const frequencyMs = frequency * 24 * 60 * 60 * 1000;

      if (lastShown && now - lastShown < frequencyMs) {
        return;
      }

      // Safe text rendering
      heading.textContent =
        String(settings.heading || "Welcome to X STORE!").slice(0, 100);

      message.textContent =
        String(settings.message || "").slice(0, 300);

      const couponCode = String(settings.coupon || "").trim().slice(0, 50);

      coupon.textContent = couponCode;
      coupon.style.display = couponCode ? "inline-block" : "none";

      action.textContent =
        String(settings.buttonText || "Shop Now").slice(0, 50);

      const validColor = value =>
        /^#[0-9a-f]{6}$/i.test(value || "");

      box.style.background = validColor(settings.background)
        ? settings.background
        : "#171717";

      box.style.color = validColor(settings.textColor)
        ? settings.textColor
        : "#f1f0e8";

      // -----------------------------
      // Button Action
      // -----------------------------

      action.addEventListener("click", async function () {
        if (couponCode && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(couponCode);
          } catch (error) {
            console.warn("Coupon copy unavailable:", error);
          }
        }

        closePopup();

        window.location.href = "index.html#shop";
      });

      // -----------------------------
      // Display Popup
      // -----------------------------

      const delay = Math.min(
        60,
        Math.max(0, Number(settings.delay) || 0)
      );

      window.setTimeout(function () {
        overlay.classList.add("is-visible");

        try {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch (error) {
          console.warn("Popup frequency could not be saved.");
        }
      }, delay * 1000);

    } catch (error) {
      console.error("First Order Popup:", error);
    }
  }

  loadPopup();

})();
