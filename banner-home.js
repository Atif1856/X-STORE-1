(async function () {
  const banner = document.getElementById("home-banner");
  if (!banner || !window.supabase || !window.XSTORE_CONFIG) return;

  try {
    const sb = window.supabase.createClient(
      window.XSTORE_CONFIG.SUPABASE_URL,
      window.XSTORE_CONFIG.SUPABASE_ANON_KEY
    );

    const { data, error } = await sb
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "home_banner")
      .maybeSingle();

    if (error) throw error;

    const url = data?.setting_value?.url;
    if (!url) return;

    const img = document.createElement("img");
    img.src = url;
    img.alt = "X STORE homepage banner";
    img.className = "home-banner-image";

    img.onload = () => banner.classList.add("has-banner");
    banner.appendChild(img);
  } catch (error) {
    console.error("Homepage banner error:", error);
  }
})();
