
(() => {
  "use strict";

  const cfg = window.XSTORE_CONFIG || {};
  const sb = window.supabase?.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );

  const $ = (s) => document.querySelector(s);
  const form = $("#delivery-charge-form");
  const list = $("#delivery-charge-list");
  const message = $("#delivery-charge-message");

  if (!sb || !form || !list) return;

  let editingId = null;

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[c]));

  const money = value =>
    "PKR " + Number(value || 0).toLocaleString("en-PK");

  function notify(text, error = false) {
    message.textContent = text;
    message.classList.remove("hidden");
    message.style.color = error ? "#b42318" : "#16803c";
  }

  async function loadCharges() {
    list.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    const { data, error } = await sb
      .from("delivery_charges")
      .select("*")
      .order("city");

    if (error) {
      list.innerHTML =
        `<tr><td colspan="5">${esc(error.message)}</td></tr>`;
      return;
    }

    if (!data.length) {
      list.innerHTML =
        '<tr><td colspan="5">No delivery charges added yet.</td></tr>';
      return;
    }

    list.innerHTML = data.map(item => `
      <tr>
        <td>${esc(item.city)}</td>
        <td>${esc(item.province)}</td>
        <td>${money(item.fee)}</td>
        <td>${item.is_active ? "Active" : "Inactive"}</td>
        <td>
          <button type="button" class="btn btn-outline btn-small"
            data-edit="${esc(item.id)}">Edit</button>
          <button type="button" class="btn btn-outline btn-small"
            data-toggle="${esc(item.id)}"
            data-active="${item.is_active}">
            ${item.is_active ? "Disable" : "Enable"}
          </button>
        </td>
      </tr>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach(button => {
      button.addEventListener("click", () => {
        const item = data.find(x => x.id === button.dataset.edit);
        if (!item) return;

        editingId = item.id;
        form.elements.city.value = item.city;
        form.elements.province.value = item.province;
        form.elements.fee.value = item.fee;
        form.querySelector('button[type="submit"]').textContent =
          "Update delivery charge";
        form.scrollIntoView({ behavior: "smooth" });
      });
    });

    list.querySelectorAll("[data-toggle]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.toggle;
        const active = button.dataset.active === "true";

        button.disabled = true;

        const { error } = await sb
          .from("delivery_charges")
          .update({ is_active: !active })
          .eq("id", id);

        if (error) notify(error.message, true);
        else notify("Delivery charge status updated.");

        await loadCharges();
      });
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const city = form.elements.city.value.trim();
    const province = form.elements.province.value.trim();
    const fee = Number(form.elements.fee.value);

    if (!city || !province || !Number.isFinite(fee) || fee < 0) {
      notify("Please enter valid city, province and fee.", true);
      return;
    }

    button.disabled = true;

    const record = {
      city,
      province,
      fee,
      is_active: true
    };

    const result = editingId
      ? await sb.from("delivery_charges").update(record).eq("id", editingId)
      : await sb.from("delivery_charges").insert(record);

    button.disabled = false;

    if (result.error) {
      notify(result.error.message, true);
      return;
    }

    notify(editingId ? "Delivery charge updated." : "Delivery charge added.");

    editingId = null;
    form.reset();
    button.textContent = "Save delivery charge";

    await loadCharges();
  });

  loadCharges();
})();
