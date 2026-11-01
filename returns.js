(() => {
  const cfg = window.XSTORE_CONFIG;
  const msg = document.getElementById('return-message');
  const say = (s) => { msg.textContent = s; };
  let supabase;
  document.addEventListener('DOMContentLoaded', async () => {
    if (!cfg || !window.supabase) { say('Store configuration could not load.'); return; }
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      document.getElementById('email').value = session.user.email;
      document.getElementById('step-request').hidden = false;
      document.getElementById('step-email').hidden = true;
      say('Your account email is verified. Enter your order details.');
    }
    document.getElementById('send-code').addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim().toLowerCase();
      if (!email) return say('Enter the email used for your order.');
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      say(error ? error.message : 'Verification link sent. Open the email on this device, then return to this page.');
    });
    document.getElementById('submit-return').addEventListener('click', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return say('Verify your email first using the link sent to your inbox.');
      const payload = {
        order_number: document.getElementById('order-number').value.trim(),
        reason: document.getElementById('reason').value,
        description: document.getElementById('description').value.trim(),
        items: [{ order_item_id: document.getElementById('item-id').value.trim(), quantity: Number(document.getElementById('item-quantity').value) }]
      };
      if (!payload.order_number || !payload.items[0].order_item_id || !Number.isInteger(payload.items[0].quantity) || payload.items[0].quantity < 1 || payload.description.length < 10)
        return say('Please complete all fields correctly.');
      say('Submitting securely…');
      const { data, error } = await supabase.functions.invoke('returns-create', { body: payload });
      if (error) return say('Request could not be submitted. The secure return service may not be deployed yet.');
      say(data?.message || 'Your return request has been submitted.');
    });
  });
})();