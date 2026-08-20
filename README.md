eSIM.OM — Netflix Upgrade

IMPORTANT ORDER

1) Supabase:
   Run esim-netflix-digital-products.sql once in SQL Editor.

2) GitHub repository root:
   Replace:
   - index.html
   - styles.css
   - app.js
   - admin.html

3) Do NOT replace:
   - config.js
   - Edge Functions (admin-login / create-admin-user)
   - existing Phase 1/2 SQL files

Netflix fields implemented:
- Product name
- Subscription duration
- Price
- Subscription type
- Devices / screens
- Quality
- Short description
- Features (one per line)
- Featured
- Delivery method
- Automatic WhatsApp message with Bank Muscat transfer number

NOT included, as requested:
- Availability / active status
- Most-popular option
- Manual sort order

The database structure uses service_slug so the same table can be reused later
for ChatGPT and other digital products without creating a new product table.
