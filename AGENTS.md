# Agent guide: Layover hotels

A static page on GitHub Pages plus a Cloudflare Worker for sync. No build step. Read `README.md`
first for the user workflow. This project follows the same workflow as `MattTrips` (the repository
next to it): copy its patterns before you invent new ones.

## Rules

- **Never put hotel data in git.** The repository is public. The hotels (names, addresses, phone
  numbers, notes, and when the user stayed) are the user's own. Test data is synthetic. `.local/` is
  gitignored for one-off scripts and exports.
- Work test first. For each change to `hotels.js`, first write a contract test that fails, then
  change the code. The test name gives the precondition and the effect.
- `index.html` (rendering and DOM wiring) has no automated test. For a change there, run the page
  locally (`README.md`, "Run locally") and do the changed task by hand. Do this before each push.
- Show a local preview and wait for the user to say "push" before any push or deploy.
- If the page loads a new file, add it to `FILES` in `sw.js`, or the page does not open offline.

## Run the tests

```bash
node --test "test/*.test.js"
```

If you change `worker/`, also run its tests. They start `wrangler dev` (local, no account):

```bash
cd worker && npm ci && npm test
```

## Sync

- The document is `{ hotels: { <id>: { updatedAt, hotel?, deleted? } } }`. Each hotel merges on its
  own: the newest `updatedAt` wins (`mergeDocs` in `hotels.js`, `merge` in `worker/src/index.js`; keep
  them the same). A delete keeps `{ updatedAt, deleted: true }`.
- Only a real change may set `updatedAt`. If a device sets it without an edit, its old copy
  overwrites newer edits from other devices.
- The sync key is SHA-256 of `layoverhotels-sync:` plus the password, as base64url (`syncKeyFor` in
  `index.html`). If you change this, each device must type the password again, and the old
  document stays under the old key.
- The Worker takes 1 MB per request and 60 requests a minute for each client address.
- Phones can run an old copy of the page from the service worker cache. If you change the API,
  keep the old requests working.

## Deploy

- Page: push to `main`. GitHub Pages serves the repository root in about a minute.
- Worker: `npm test`, then `npm run deploy` in `worker/`. It needs `wrangler login` to the owner's
  Cloudflare account. The URL is `https://layoverhotels-sync.matttrips-sync.workers.dev`, and
  `SYNC_URL` in `index.html` uses it.
- First time for the real hotels: `node .local/migrate.mjs <Worker URL>` (the user types the
  password in their own terminal). The old artifact's hotels are in `.local/export/`.
