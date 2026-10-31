
(async function () {
  const config = window.XSTORE_CONFIG;

  if (!window.supabase || !config) return;

  const sb = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  const tabs = document.querySelector(".admin-tabs");
  const main = document.querySelector(".admin-wrap");

  if (!tabs || !main) return;

  // -----------------------------
  // Create First Order Popup Tab
  // -----------------------------

  const tabButton = document.createElement("button");
  tabButton.className = "tab-btn";
  tabButton.dataset.tab = "first-order-popup";
  tabButton.textContent = "First Order Popup";
  tabs.appendChild(tabButton);

  const panel = document.createElement("section");
  panel.id = "tab-first-order-popup";
  panel.className = "admin-tab hidden";

  panel.innerHTML = `
    <div class="admin-section-heading">
      <h2>First Order Discount Popup</h2>
      <p class="muted">
        Manage the promotional popup displayed to website visitors.
      </p>
    </div>

    <div class="panel">

      <label class="full">
        <input type="checkbox" id="popup-enabled">
        Enable First Order Popup
      </label>

      <label class="full" style="margin-top:18px">
        Popup Heading
        <input type="text" id="popup-heading"
          maxlength="100"
          placeholder="Welcome to X STORE!">
      </label>

      <label class="full" style="margin-top:15px">
        Popup Message
        <textarea id="popup-message" rows="3"
          maxlength="300"
          placeholder="Get an exclusive discount on your first order."></textarea>
      </label>

      <label class="full" style="margin-top:15px">
        Coupon Code
        <input type="text" id="popup-coupon"
          maxlength="50"
          placeholder="FIRST10">
        <small>
          Enter a coupon code that already exists in your coupon system.
        </small>
      </label>

      <label class="full" style="margin-top:15px">
        Button Text
        <input type="text" id="popup-button-text"
          maxlength="50"
          placeholder="Shop Now">
      </label>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:15px;
        margin-top:18px;
      ">
        <label>
          Popup Background
          <input type="color" id="popup-background"
            value="#171717"
            style="width:100%;height:42px">
        </label>

        <label>
          Text Color
          <input type="color" id="popup-text-color"
            value="#f1f0e8"
            style="width:100%;height:42px">
        </label>
      </div>

      <label class="full" style="margin-top:18px">
        Display Delay (Seconds)
        <input type="number" id="popup-delay"
          min="0" max="60" value="3">
        <small>How long to wait before showing the popup.</small>
      </label>

      <label class="full" style="margin-top:15px">
        Show Again After (Days)
        <input type="number" id="popup-frequency"
          min="1" max="365" value="7">
        <small>
          Controls how often the popup reappears in the same browser.
        </small>
      </label>

      <div class="form-actions" style="margin-top:22px">
        <button id="popup-save" class="btn btn-dark" type="button">
          Save Popup Settings
        </button>
      </div>

      <div id="popup-admin-message"
        class="notice hidden"
        role="status"
        style="margin-top:16px">
      </div>

    </div>
  `;

  main.appendChild(panel);

  // -----------------------------
  // Tab Handling
  // -----------------------------

  tabButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    document.querySelectorAll(".admin-tab").forEach(section => {
      section.classList.add("hidden");
    });

    document.querySelectorAll(".tab-btn").forEach(button => {
      button.classList.remove("active");
    });

    panel.classList.remove("hidden");
    tabButton.classList.add("active");
  }, true);

  // -----------------------------
  // Elements
  // -----------------------------

  const enabledInput = document.getElementById("popup-enabled");
  const headingInput = document.getElementById("popup-heading");
  const messageInput = document.getElementById("popup-message");
  const couponInput = document.getElementById("popup-coupon");
  const buttonTextInput = document.getElementById("popup-button-text");
  const backgroundInput = document.getElementById("popup-background");
  const textColorInput = document.getElementById("popup-text-color");
  const delayInput = document.getElementById("popup-delay");
  const frequencyInput = document.getElementById("popup-frequency");
  const saveButton = document.getElementById("popup-save");
  const statusMessage = document.getElementById("popup-admin-message");

  // -----------------------------
  // Messages
  // -----------------------------

  function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("hidden");
    statusMessage.style.color = isError ? "#b42318" : "";
  }

  // -----------------------------
  // Admin Permission
  // -----------------------------

  async function checkAdmin() {
    const { data: sessionData, error: sessionError } =
      await sb.auth.getSession();

    if (sessionError || !sessionData.session) {
      throw new Error("Please log in to your admin account.");
    }

    const { data, error } = await sb.rpc("is_admin");

    if (error || data !== true) {
      throw new Error("Admin permission required.");
    }
  }

  // -----------------------------
  // Load Saved Settings
  // -----------------------------

  async function loadPopupSettings() {
    const { data, error } = await sb
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "first_order_popup")
      .maybeSingle();

    if (error) throw error;

    const settings = data?.setting_value || {};

    enabledInput.checked = settings.enabled === true;

    headingInput.value =
      typeof settings.heading === "string"
        ? settings.heading
        : "Welcome to X STORE!";

    messageInput.value =
      typeof settings.message === "string"
        ? settings.message
        : "Get an exclusive discount on your first order.";

    couponInput.value =
      typeof settings.coupon === "string"
        ? settings.coupon
        : "";

    buttonTextInput.value =
      typeof settings.buttonText === "string"
        ? settings.buttonText
        : "Shop Now";

    backgroundInput.value =
      /^#[0-9a-f]{6}$/i.test(settings.background || "")
        ? settings.background
        : "#171717";

    textColorInput.value =
      /^#[0-9a-f]{6}$/i.test(settings.textColor || "")
        ? settings.textColor
        : "#f1f0e8";

    delayInput.value = Math.min(
      60,
      Math.max(0, Number(settings.delay) || 0)
    );

    frequencyInput.value = Math.min(
      365,
      Math.max(1, Number(settings.frequency) || 7)
    );
  }

  // -----------------------------
  // Save Settings
  // -----------------------------

  saveButton.addEventListener("click", async function () {
    saveButton.disabled = true;
    showMessage("Saving popup settings...");

    try {
      await checkAdmin();

      const heading = headingInput.value.trim();
      const message = messageInput.value.trim();
      const coupon = couponInput.value.trim();
      const buttonText = buttonTextInput.value.trim();

      const delay = Number(delayInput.value);
      const frequency = Number(frequencyInput.value);

      if (!heading) {
        throw new Error("Please enter a popup heading.");
      }

      if (!message) {
        throw new Error("Please enter a popup message.");
      }

      if (!buttonText) {
        throw new Error("Please enter button text.");
      }

      if (!Number.isInteger(delay) || delay < 0 || delay > 60) {
        throw new Error("Display delay must be between 0 and 60 seconds.");
      }

      if (
        !Number.isInteger(frequency) ||
        frequency < 1 ||
        frequency > 365
      ) {
        throw new Error("Frequency must be between 1 and 365 days.");
      }

      const settings = {
        enabled: enabledInput.checked,
        heading: heading.slice(0, 100),
        message: message.slice(0, 300),
        coupon: coupon.slice(0, 50),
        buttonText: buttonText.slice(0, 50),
        background: backgroundInput.value,
        textColor: textColorInput.value,
        delay,
        frequency
      };

      const { error } = await sb
        .from("site_settings")
        .upsert({
          setting_key: "first_order_popup",
          setting_value: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "setting_key"
        });

      if (error) throw error;

      showMessage("First Order Popup settings saved successfully.");

    } catch (error) {
      showMessage(
        error.message || "Could not save popup settings.",
        true
      );

    } finally {
      saveButton.disabled = false;
    }
  });

  // -----------------------------
  // Initial Loading
  // -----------------------------

  try {
    await checkAdmin();
    await loadPopupSettings();

  } catch (error) {
    showMessage(error.message, true);
    saveButton.disabled = true;
  }

})();
