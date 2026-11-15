<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
## Project rules
- Account access is gated by `profiles.status` (pending/approved/rejected/blocked); only admins may change it (DB trigger), so never let client code bypass that check.
- Roles live in `user_roles` with the `has_role` security-definer function; never store roles on profiles.
- The signal engine is pure functions in `src/lib/bacbo-engine.ts`; the shared schedule in `src/lib/robot-schedule.ts` derives cycles and signals deterministically from `robot_settings.started_at`, so every client shows the same signal without a server job. `src/lib/robot-context.tsx` only wires settings, timers and session history.
- Only admins switch the robot on/off (`robot_settings.running`, admin-only update policy); clients poll settings, so never start signals from client-side state alone.
- Signal history is per login session in localStorage (keyed by user and `last_sign_in_at`, cleared on sign-out); the old `signals` table is deprecated.
- Avatars live in the private `avatars` bucket under `<user_id>/`; `profiles.avatar_url` stores the storage path (or an external Google URL) and is shown via short-lived signed URLs because public buckets are blocked in this workspace.
- Approved-only pages live under `src/routes/_authenticated/_approved/`; its `beforeLoad` reads the cached `myAccountQuery` (profile + admin flag) so tab switches skip the network, and pages read live values via `useMyAccount()`; edits such as a new avatar update that cache, never `router.invalidate()`.
- Admin is granted only by a `user_roles` row; the signup trigger `handle_new_user` adds it (and approves) solely for the single reserved admin e-mail, because the owner chose first-signup-claims-it with auto-confirm on; never add other email-based grants.
- Deleting accounts goes through the admin-only `deleteUserAccount` server function (`src/lib/admin.functions.ts`), which checks `has_role` before using the service client, because removing auth users needs privileged access.
- The `_authenticated` guard reads the local session (`getSession`), not `getUser()`, because a server round-trip on every tab switch froze navigation on phones; data safety comes from RLS on each request.
- The 3D die is one shared three.js instance in `src/lib/die-engine.ts`, warmed in idle time by the approved layout and re-attached by `Cube3D`, so it never rebuilds WebGL per signal or per tab.
- App images are bundled files in `src/assets` imported directly (not `.asset.json` pointers), because the owner deploys to Vercel/Netlify where the `/__l5e/` asset paths don't exist.
