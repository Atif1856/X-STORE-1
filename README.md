# X STORE — GitHub Pages + Supabase starter

This project is a static storefront/admin interface that can be published with GitHub Pages. Supabase provides authentication, database, and image storage. **GitHub Pages does not provide a backend itself.**

## Important limitations before real launch

This is a starter implementation, not yet a fully production-hardened ecommerce platform. In particular, the included browser-based checkout inserts order and item records directly from the browser. Although RLS prevents customers from reading orders, a determined visitor could tamper with order values or submit unwanted records. **Before accepting real orders, move checkout into a Supabase Edge Function** that validates product prices and quantities, calculates totals on the server, uses a transaction/RPC to reserve stock safely, applies rate limiting, and writes the order plus items atomically. The included checkout does not atomically decrement stock, so do not launch it for real payments/orders until this is fixed and tested.

The order confirmation is a browser page, not proof that an order was accepted by the server unless the order insert succeeded. Email/SMS and courier integrations are not included.

## 1. Create Supabase project

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** and run the complete `schema.sql`.
3. Open **Project Settings → API** and copy the Project URL and anon/public key.
4. Edit `config.js` and paste those two values. Use only the anon/public key in this frontend. Never put a service-role key in a public repository.
5. In Supabase Auth settings, turn off public signups if you do not want customer accounts. Guest COD orders still work in this starter.
6. In **Authentication → Users**, create the admin user with email `khanatifullahkhan56@gmail.com` and choose the password there. Do not put the password in source code.
7. In SQL Editor, assign the admin role:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE lower(email) = lower('khanatifullahkhan56@gmail.com');
   ```
   Confirm exactly one row was updated. If zero rows updated, verify the user exists in Auth and the profile trigger ran. Never assign admin role based only on public signup.
8. Verify the `product-images` storage bucket exists and the storage policies from `schema.sql` are installed.

## 2. Run locally

For a simple local test, use VS Code's Live Server extension or any static HTTP server. Opening HTML directly as `file://` can cause auth/browser restrictions. Configure Supabase first.

## 3. Publish with GitHub Pages

1. Create a GitHub repository, e.g. `x-store`.
2. Upload all project files to the repository root: `index.html`, `cart.html`, `checkout.html`, `order-success.html`, `admin-login.html`, `admin.html`, `policy.html`, `style.css`, `app.js`, `config.js`, `schema.sql`, and this README.
3. Open repository **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
5. Wait for GitHub Pages to publish the site. The URL will look like `https://YOUR-USERNAME.github.io/x-store/`.
6. In Supabase Auth URL configuration, set the Site URL to the published site URL and add that URL under Redirect URLs if needed.
7. Test the site in a private browser window.

Do not publish a database password, service-role key, or admin password in the repository. The Supabase anon key is intended for browser use when the database is correctly protected by RLS.

## 4. Admin use

- Admin login: `admin-login.html`
- Dashboard: `admin.html`
- The admin account must exist in Supabase Auth and its `profiles.role` must be `admin`.
- Products: add/edit products, prices, descriptions, stock, images, publish status.
- Orders: view order details and update status.
- Categories: add and remove categories.

## 5. Required pre-launch hardening

Before real customers use the store:
- Implement a Supabase Edge Function for checkout and validate totals/stock server-side.
- Use a database transaction or RPC for atomic stock reservation and order creation.
- Add rate limiting and bot/spam controls to guest checkout.
- Prevent direct public order-item inserts except through the checkout function.
- Add order tracking with a random secret or verified phone flow; do not expose order details by predictable order number.
- Add server-side order history inserts for every status change.
- Review privacy, return, shipping, and tax policies for your business.
- Test RLS with anonymous and non-admin accounts.
- Configure backups and monitor Supabase usage.
- Configure real notification services if email/SMS confirmations are required.

## Files

- `index.html` — Storefront
- `cart.html` — Cart
- `checkout.html` — COD checkout
- `order-success.html` — Confirmation page
- `admin-login.html` — Admin authentication
- `admin.html` — Product, category, and order management
- `style.css` — Classic ivory/black/champagne design
- `app.js` — Frontend logic
- `config.js` — Public Supabase URL/key and shipping configuration
- `schema.sql` — Initial database schema and RLS policies
