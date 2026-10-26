# The 69 Store

Order manager for The 69 Store. The app supports local browser storage for setup and a shared Supabase database for use across devices.

## Shared online setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
2. In Supabase Auth settings, turn off public sign-ups. Create one email/password user for each team member and set the user's metadata field `member_name` to exactly `Pramit`, `Sohana`, or `Sumedh`.
3. Copy `.env.example` to `.env` for local use. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's API settings. Use the publishable key (or the older anon key); never put a secret/service-role key in this app.
4. Publish with a static host. Netlify is configured in [`netlify.toml`](netlify.toml); set those two environment variables in the Netlify site settings before its production build.

When Supabase is configured, staff sign in with their Supabase email and password. Order records are shared through the protected `orders` table. Without those settings, the app uses the current browser's local storage and orders will not sync to other devices.

To move orders already saved in a browser into Supabase, download a JSON backup from Dashboard → Data Management before switching to the cloud build. Sign in to the cloud build and choose **Merge JSON Backup** to add them to the shared database.

## Order database tools

The Orders tab edits each full order, including item quantities and option choices. Dashboard → Data Management can export a CSV for reporting, download the full JSON backup, merge a backup, or replace the database from a backup. JSON backups preserve the order IDs, options, timestamps, statuses, and totals.

## Development

```sh
npm install
npm run dev
```

For production, configure the two Supabase environment variables and run:

```sh
npm run build
```
