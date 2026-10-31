
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
  // Website Settings tab
  // -----------------------------

  const tabButton = document.createElement("button");
  tabButton.className = "tab-btn";
  tabButton.dataset.tab = "website";
  tabButton.textContent = "Website Settings";
  tabs.appendChild(tabButton);

  const panel = document.createElement("section");
  panel.id = "tab-website";
  panel.className = "admin-tab hidden";

  panel.innerHTML = `
    <div class="admin-section-heading">
      <h2>Website Settings</h2>
    </div>

    <div class="panel">
      <h3>Homepage Banner</h3>
      <p class="muted">Upload an image to change the homepage banner.</p>

      <label class="full">
        Select banner image
        <input id="home-banner-file" type="file"
          accept="image/jpeg,image/png,image/webp">
        <small>JPG, PNG or WebP. Maximum 5 MB.</small>
      </label>

      <div id="banner-preview-wrap" class="hidden" style="margin-top:16px">
        <img id="banner-preview" alt="Banner preview"
          style="width:100%;max-width:500px;max-height:250px;object-fit:cover;border-radius:12px">
      </div>

      <div class="form-actions" style="margin-top:18px">
        <button id="save-home-banner" class="btn btn-dark" type="button">
          Upload & Save Banner
        </button>
        <button id="remove-home-banner" class="btn btn-outline" type="button">
          Remove Banner
        </button>
      </div>

      <div id="banner-admin-message" class="notice hidden"
        role="status" style="margin-top:16px"></div>
    </div>

    <div class="panel" style="margin-top:24px">
      <h3>Announcement Bar Manager</h3>
      <p class="muted">
        Manage the promotional messages displayed at the top of your website.
      </p>

      <label class="full" style="margin-top:15px">
        <input type="checkbox" id="announcement-enabled">
        Enable Announcement Bar
      </label>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:18px">
        <label>
          Background Color
          <input type="color" id="announcement-bg" value="#171717"
            style="width:100%;height:42px">
        </label>

        <label>
          Text Color
          <input type="color" id="announcement-color" value="#f1f0e8"
            style="width:100%;height:42px">
        </label>
      </div>

      <label class="full" style="margin-top:15px">
        Slide Interval (seconds)
        <input type="number" id="announcement-interval"
          min="2" max="15" value="4">
        <small>How long each offer stays visible.</small>
      </label>

      <hr style="margin:22px 0;border:0;border-top:1px solid #ddd">

      <h4 id="announcement-form-heading">Add New Offer</h4>

      <label class="full">
        Offer Text
        <input type="text" id="announcement-text"
          maxlength="120"
          placeholder="Example: FIRST ORDER? GET 10% OFF">
      </label>

      <label class="full" style="margin-top:12px">
        Link (Optional)
        <input type="text" id="announcement-link"
          maxlength="300"
          placeholder="Example: index.html#shop">
        <small>Leave empty if the offer should not open a link.</small>
      </label>

      <div class="form-actions" style="margin-top:15px">
        <button id="announcement-add" class="btn btn-dark" type="button">
          Add Offer
        </button>
        <button id="announcement-cancel" class="btn btn-outline hidden"
          type="button">
          Cancel Edit
        </button>
      </div>

      <div style="margin-top:25px">
        <h4>Saved Offers</h4>
        <div id="announcement-list">
          <p class="muted">No offers added yet.</p>
        </div>
      </div>

      <div class="form-actions" style="margin-top:22px">
        <button id="announcement-save" class="btn btn-dark" type="button">
          Save Announcement Settings
        </button>
      </div>

      <div id="announcement-message" class="notice hidden"
        role="status" style="margin-top:16px"></div>
    </div>
  `;

  main.appendChild(panel);

  // -----------------------------
  // Tab handling
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
  // Homepage banner elements
  // -----------------------------

  const fileInput = document.getElementById("home-banner-file");
  const preview = document.getElementById("banner-preview");
  const previewWrap = document.getElementById("banner-preview-wrap");
  const bannerMessage = document.getElementById("banner-admin-message");
  const saveButton = document.getElementById("save-home-banner");
  const removeButton = document.getElementById("remove-home-banner");

  let currentBanner = null;

  function showBannerMessage(text, isError = false) {
    bannerMessage.textContent = text;
    bannerMessage.classList.remove("hidden");
    bannerMessage.style.color = isError ? "#b42318" : "";
  }

  function showPreview(url) {
    preview.src = url;
    previewWrap.classList.remove("hidden");
  }

  // -----------------------------
  // Admin permission
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
  // Homepage banner loading
  // -----------------------------

  async function loadBanner() {
    const { data, error } = await sb
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "home_banner")
      .maybeSingle();

    if (error) throw error;

    currentBanner = data?.setting_value || null;

    if (currentBanner?.url) {
      showPreview(currentBanner.url);
    }
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showBannerMessage("Only JPG, PNG and WebP images are allowed.", true);
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showBannerMessage("Image must be 5 MB or smaller.", true);
      fileInput.value = "";
      return;
    }

    showPreview(URL.createObjectURL(file));
    bannerMessage.classList.add("hidden");
  });

  saveButton.addEventListener("click", async function () {
    const file = fileInput.files?.[0];

    if (!file) {
      showBannerMessage("Please select a banner image first.", true);
      return;
    }

    saveButton.disabled = true;
    showBannerMessage("Uploading banner...");

    let uploadedPath = null;

    try {
      await checkAdmin();

      const extension = file.name.split(".").pop().toLowerCase();
      const uniqueName =
        "home-banner-" + Date.now() + "." + extension;

      uploadedPath = uniqueName;

      const { error: uploadError } = await sb.storage
        .from("site-assets")
        .upload(uploadedPath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = sb.storage
        .from("site-assets")
        .getPublicUrl(uploadedPath);

      const newBanner = {
        url: publicData.publicUrl,
        path: uploadedPath
      };

      const { error: saveError } = await sb
        .from("site_settings")
        .upsert({
          setting_key: "home_banner",
          setting_value: newBanner,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "setting_key"
        });

      if (saveError) throw saveError;

      const oldPath = currentBanner?.path;
      currentBanner = newBanner;

      if (oldPath && oldPath !== uploadedPath) {
        await sb.storage.from("site-assets").remove([oldPath]);
      }

      showPreview(newBanner.url);
      fileInput.value = "";
      showBannerMessage("Homepage banner saved successfully.");

    } catch (error) {
      if (uploadedPath) {
        await sb.storage.from("site-assets").remove([uploadedPath]);
      }

      showBannerMessage(error.message || "Banner upload failed.", true);

    } finally {
      saveButton.disabled = false;
    }
  });

  removeButton.addEventListener("click", async function () {
    if (!currentBanner?.path) {
      showBannerMessage("No saved banner found.", true);
      return;
    }

    removeButton.disabled = true;

    try {
      await checkAdmin();

      const { error } = await sb
        .from("site_settings")
        .delete()
        .eq("setting_key", "home_banner");

      if (error) throw error;

      await sb.storage.from("site-assets").remove([currentBanner.path]);

      currentBanner = null;
      previewWrap.classList.add("hidden");
      fileInput.value = "";

      showBannerMessage("Homepage banner removed.");

    } catch (error) {
      showBannerMessage(error.message || "Could not remove banner.", true);

    } finally {
      removeButton.disabled = false;
    }
  });

  // -----------------------------
  // Announcement Bar Manager
  // -----------------------------

  const enabledInput = document.getElementById("announcement-enabled");
  const bgInput = document.getElementById("announcement-bg");
  const colorInput = document.getElementById("announcement-color");
  const intervalInput = document.getElementById("announcement-interval");
  const offerTextInput = document.getElementById("announcement-text");
  const offerLinkInput = document.getElementById("announcement-link");
  const addOfferButton = document.getElementById("announcement-add");
  const cancelEditButton = document.getElementById("announcement-cancel");
  const offerList = document.getElementById("announcement-list");
  const saveAnnouncementButton = document.getElementById("announcement-save");
  const announcementMessage = document.getElementById("announcement-message");
  const formHeading = document.getElementById("announcement-form-heading");

  let offers = [];
  let editingIndex = -1;

  function showAnnouncementMessage(text, isError = false) {
    announcementMessage.textContent = text;
    announcementMessage.classList.remove("hidden");
    announcementMessage.style.color = isError ? "#b42318" : "";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safeLink(value) {
    const link = String(value || "").trim();

    if (!link) return "";

    // Only allow relative paths or safe web links.
    if (
      link.startsWith("/") ||
      link.startsWith("./") ||
      link.startsWith("../") ||
      link.startsWith("#") ||
      /^https?:\/\//i.test(link)
    ) {
      return link;
    }

    throw new Error("Link must be a valid relative path or HTTPS/HTTP URL.");
  }

  function resetOfferForm() {
    offerTextInput.value = "";
    offerLinkInput.value = "";
    editingIndex = -1;
    addOfferButton.textContent = "Add Offer";
    cancelEditButton.classList.add("hidden");
    formHeading.textContent = "Add New Offer";
  }

  function renderOffers() {
    if (!offers.length) {
      offerList.innerHTML =
        '<p class="muted">No offers added yet.</p>';
      return;
    }

    offerList.innerHTML = offers.map((offer, index) => `
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
        padding:14px;
        margin-top:10px;
        border:1px solid #ddd;
        border-radius:8px;
      ">
        <div style="min-width:180px;flex:1">
          <strong>${escapeHTML(offer.text)}</strong>
          ${
            offer.url
              ? `<div class="muted" style="font-size:12px;margin-top:5px">${escapeHTML(offer.url)}</div>`
              : '<div class="muted" style="font-size:12px;margin-top:5px">No link</div>'
          }
        </div>

        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-outline"
            data-edit-offer="${index}">Edit</button>

          <button type="button" class="btn btn-outline"
            data-delete-offer="${index}">Delete</button>
        </div>
      </div>
    `).join("");
  }

  addOfferButton.addEventListener("click", function () {
    const text = offerTextInput.value.trim();

    if (!text) {
      showAnnouncementMessage("Please enter offer text.", true);
      return;
    }

    let url = "";

    try {
      url = safeLink(offerLinkInput.value);
    } catch (error) {
      showAnnouncementMessage(error.message, true);
      return;
    }

    const offer = { text, url };

    if (editingIndex >= 0) {
      offers[editingIndex] = offer;
    } else {
      offers.push(offer);
    }

    resetOfferForm();
    renderOffers();

    showAnnouncementMessage("Offer added to the list. Click Save Announcement Settings to publish it.");
  });

  cancelEditButton.addEventListener("click", resetOfferForm);

  offerList.addEventListener("click", function (event) {
    const editButton = event.target.closest("[data-edit-offer]");
    const deleteButton = event.target.closest("[data-delete-offer]");

    if (editButton) {
      const index = Number(editButton.dataset.editOffer);
      const offer = offers[index];

      if (!offer) return;

      editingIndex = index;
      offerTextInput.value = offer.text;
      offerLinkInput.value = offer.url || "";

      addOfferButton.textContent = "Update Offer";
      cancelEditButton.classList.remove("hidden");
      formHeading.textContent = "Edit Offer";

      offerTextInput.focus();
    }

    if (deleteButton) {
      const index = Number(deleteButton.dataset.deleteOffer);

      if (!Number.isInteger(index) || !offers[index]) return;

      offers.splice(index, 1);

      if (editingIndex === index) {
        resetOfferForm();
      } else if (editingIndex > index) {
        editingIndex--;
      }

      renderOffers();
      showAnnouncementMessage("Offer removed from the list. Save settings to publish changes.");
    }
  });

  async function loadAnnouncementSettings() {
    const { data, error } = await sb
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "announcement_bar")
      .maybeSingle();

    if (error) throw error;

    const settings = data?.setting_value || {};

    enabledInput.checked = settings.enabled === true;
    bgInput.value = /^#[0-9a-f]{6}$/i.test(settings.background || "")
      ? settings.background
      : "#171717";

    colorInput.value = /^#[0-9a-f]{6}$/i.test(settings.color || "")
      ? settings.color
      : "#f1f0e8";

    intervalInput.value = Math.min(
      15,
      Math.max(2, Number(settings.interval) || 4)
    );

    offers = Array.isArray(settings.offers)
      ? settings.offers
          .filter(item => item && typeof item.text === "string")
          .map(item => ({
            text: item.text.slice(0, 120),
            url: typeof item.url === "string" ? item.url : ""
          }))
      : [];

    renderOffers();
  }

  saveAnnouncementButton.addEventListener("click", async function () {
    saveAnnouncementButton.disabled = true;
    showAnnouncementMessage("Saving announcement settings...");

    try {
      await checkAdmin();

      const interval = Number(intervalInput.value);

      if (!Number.isFinite(interval) || interval < 2 || interval > 15) {
        throw new Error("Slide interval must be between 2 and 15 seconds.");
      }

      const cleanedOffers = offers.map(offer => ({
        text: String(offer.text || "").trim().slice(0, 120),
        url: safeLink(offer.url)
      })).filter(offer => offer.text);

      const settings = {
        enabled: enabledInput.checked,
        background: bgInput.value,
        color: colorInput.value,
        interval,
        offers: cleanedOffers
      };

      const { error } = await sb
        .from("site_settings")
        .upsert({
          setting_key: "announcement_bar",
          setting_value: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "setting_key"
        });

      if (error) throw error;

      offers = cleanedOffers;
      renderOffers();

      showAnnouncementMessage(
        "Announcement settings saved successfully."
      );

    } catch (error) {
      showAnnouncementMessage(
        error.message || "Could not save announcement settings.",
        true
      );

    } finally {
      saveAnnouncementButton.disabled = false;
    }
  });

  // -----------------------------
  // Initial loading
  // -----------------------------

  try {
    await checkAdmin();
    await Promise.all([
      loadBanner(),
      loadAnnouncementSettings()
    ]);

  } catch (error) {
    showBannerMessage(error.message, true);
    showAnnouncementMessage(error.message, true);

    saveButton.disabled = true;
    removeButton.disabled = true;
    fileInput.disabled = true;
    saveAnnouncementButton.disabled = true;
    addOfferButton.disabled = true;
  }

})();
