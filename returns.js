(() => {
  const status = document.getElementById("status");
  const say = (text) => status.textContent = text;
  let client;
  window.addEventListener("load", async () => {
    const c = window.XSTORE_CONFIG;
    if (!c || !window.supabase) return say("Store setup could not load.");
    client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
    const { data: { session } } = await client.auth.getSession();
    if (session?.user?.email) {
      document.getElementById("email").value = session.user.email;
      document.getElementById("request-form").hidden = false;
      document.getElementById("send-code").hidden = true;
      say("Signed in. Enter your return details.");
    }
    document.getElementById("send-code").onclick = async () => {
      const email = document.getElementById("email").value.trim().toLowerCase();
      if (!email) return say("Enter the email used for your order.");
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("?")[0] } });
      say(error ? error.message : "Verification link sent. Open it from your email, then return here.");
    };
    document.getElementById("submit").onclick = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!session) return say("Verify your email first.");
      const body = {
        order_number: document.getElementById("order-number").value.trim(),
        reason: document.getElementById("reason").value,
        description: document.getElementById("description").value.trim(),
        items: [{ order_item_id: document.getElementById("item-id").value.trim(), quantity: Number(document.getElementById("quantity").value) }]
      };
      if (!body.order_number || !body.items[0].order_item_id || !Number.isInteger(body.items[0].quantity) || body.items[0].quantity < 1 || body.description.length < 10) return say("Complete all fields correctly.");
      say("Submitting…");
      const { data, error } = await client.functions.invoke("returns-create", { body });
      say(error ? "Secure return service is not deployed yet. Contact X STORE support for now." : (data?.message || "Request submitted."));
    };
  });
})();