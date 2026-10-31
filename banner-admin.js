
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

  // Add Website Settings tab
  const tabButton = document.createElement("button");
  tabButton.className = "tab-btn";
  tabButton.dataset.tab = "website";
  tabButton.textContent = "Website Settings";
  tabs.appendChild(tabButton);

  // Add Website Settings panel
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
  `;

  main.appendChild(panel);

  // Handle this tab independently
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

  const fileInput = document.getElementById("home-banner-file");
  const preview = document.getElementById("banner-preview");
  const previewWrap = document.getElementById("banner-preview-wrap");
  const message = document.getElementById("banner-admin-message");
  const saveButton = document.getElementById("save-home-banner");
  const removeButton = document.getElementById("remove-home-banner");

  let currentBanner = null;

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.remove("hidden");
    message.style.color = isError ? "#b42318" : "";
  }

  function showPreview(url) {
    preview.src = url;
    previewWrap.classList.remove("hidden");
  }

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

  try {
    await checkAdmin();
    await loadBanner();
  } catch (error) {
    showMessage(error.message, true);
    saveButton.disabled = true;
    removeButton.disabled = true;
    fileInput.disabled = true;
    return;
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage("Only JPG, PNG and WebP images are allowed.", true);
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Image must be 5 MB or smaller.", true);
      fileInput.value = "";
      return;
    }

    showPreview(URL.createObjectURL(file));
    message.classList.add("hidden");
  });

  saveButton.addEventListener("click", async function () {
    const file = fileInput.files?.[0];

    if (!file) {
      showMessage("Please select a banner image first.", true);
      return;
    }

    saveButton.disabled = true;
    showMessage("Uploading banner...");

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
      showMessage("Homepage banner saved successfully.");
    } catch (error) {
      if (uploadedPath) {
        await sb.storage.from("site-assets").remove([uploadedPath]);
      }
      showMessage(error.message || "Banner upload failed.", true);
    } finally {
      saveButton.disabled = false;
    }
  });

  removeButton.addEventListener("click", async function () {
    if (!currentBanner?.path) {
      showMessage("No saved banner found.", true);
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

      showMessage("Homepage banner removed.");
    } catch (error) {
      showMessage(error.message || "Could not remove banner.", true);
    } finally {
      removeButton.disabled = false;
    }
  });
})();
