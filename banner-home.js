
(function () {
  async function initHomepageFeatures() {
    const config = window.XSTORE_CONFIG;

    if (
      !window.supabase ||
      !config ||
      !config.SUPABASE_URL ||
      !config.SUPABASE_ANON_KEY
    ) {
      console.error("X STORE configuration or Supabase is missing.");
      return;
    }

    const bar = document.getElementById("announcement-bar");
    const content = document.getElementById("announcement-content");
    const closeButton = document.getElementById("announcement-close");
    const banner = document.getElementById("home-banner");

    let slideTimer = null;
    let offers = [];
    let currentIndex = 0;

    function hideAnnouncement() {
      if (bar) bar.classList.remove("is-visible");

      if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
      }
    }

    function safeLink(value) {
      const link = String(value || "").trim();
      if (!link) return "";

      if (
        link.startsWith("/") ||
        link.startsWith("./") ||
        link.startsWith("../") ||
        link.startsWith("#")
      ) {
        return link;
      }

      try {
        const url = new URL(link, window.location.origin);

        if (url.protocol === "https:" || url.protocol === "http:") {
          return url.href;
        }
      } catch (error) {
        return "";
      }

      return "";
    }

    function displayOffer(index) {
      if (!offers.length || !content) return;

      currentIndex = index % offers.length;
      const offer = offers[currentIndex];

      content.classList.add("is-changing");

      setTimeout(() => {
        content.textContent = offer.text;

        const link = safeLink(offer.url);

        if (link) {
          content.href = link;
          content.style.pointerEvents = "auto";
        } else {
          content.removeAttribute("href");
          content.style.pointerEvents = "none";
        }

        content.classList.remove("is-changing");
      }, 300);
    }

    function startSlider(interval) {
      if (slideTimer) clearInterval(slideTimer);

      if (offers.length <= 1) return;

      slideTimer = setInterval(() => {
        displayOffer(currentIndex + 1);
      }, interval * 1000);
    }

    if (closeButton) {
      closeButton.addEventListener("click", hideAnnouncement);
    }

    try {
      const sb = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // Homepage banner
      if (banner) {
        const { data, error } = await sb
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "home_banner")
          .maybeSingle();

        if (error) {
          console.error("Homepage banner error:", error);
        } else {
          const url = data?.setting_value?.url;

          if (url) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "X STORE homepage banner";
            img.className = "home-banner-image";

            img.onload = () => banner.classList.add("has-banner");
            banner.appendChild(img);
          }
        }
      }

      // Announcement bar
      if (bar && content) {
        const { data, error } = await sb
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "announcement_bar")
          .maybeSingle();

        if (error) throw error;

        const settings = data?.setting_value;

        if (!settings || settings.enabled !== true) {
          hideAnnouncement();
          return;
        }

        offers = Array.isArray(settings.offers)
          ? settings.offers.filter(item =>
              item &&
              typeof item.text === "string" &&
              item.text.trim()
            )
          : [];

        if (!offers.length) {
          hideAnnouncement();
          return;
        }

        bar.style.backgroundColor =
          /^#[0-9a-f]{6}$/i.test(settings.background || "")
            ? settings.background
            : "#171717";

        bar.style.color =
          /^#[0-9a-f]{6}$/i.test(settings.color || "")
            ? settings.color
            : "#f1f0e8";

        const interval = Math.min(
          15,
          Math.max(2, Number(settings.interval) || 4)
        );

        bar.classList.add("is-visible");
        displayOffer(0);
        startSlider(interval);
      }

    } catch (error) {
      console.error("Homepage features error:", error);
      hideAnnouncement();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHomepageFeatures);
  } else {
    initHomepageFeatures();
  }
})();
