# Layover hotels

A single page to keep notes on layover hotels by airport: address and phone, free breakfast and
happy hour, food nearby, gym and pool, water, notes, and when you last stayed.

Site: https://mattpasco.github.io/LayoverHotels/

## Files

- `index.html`: the page (markup, styles, rendering, and the sync client).
- `hotels.js`: the hotel list and the rules that change it (save, delete, search, sort, merge).
- `sw.js` and `manifest.json`: offline launch and the Home Screen app.
- `worker/`: the sync server (a Cloudflare Worker). `test/`: contract tests for `hotels.js`.
  `worker/test/`: HTTP tests for the Worker.

## Use

1. Open the site and type your hotels password (10 or more characters). Use the same password on
   each device. Your password manager can save it.
2. `Add hotel`: choose the airport code (3 letters), and fill in what you know. A search of 3 letters
   (for example `mem`) before you tap `Add hotel` starts the new hotel with that code.
3. Tap a hotel to see it. `Edit` changes it, and `Delete` (in `Edit`) asks a second time.
4. The search finds the airport code, hotel name, address, food, running and gym notes, and notes.
5. Each change syncs to your other devices within a few seconds, and again each time you open the
   page. With no network, the top says `Saved on this device`, and the page tries again later.
6. `Lock` forgets the password and the hotels on this device.

The hotels are not in this repository (it is public). They are in the sync Worker, under a key made
from the password. Anyone who knows the password can see and change the hotels.

## Offline and iPhone

The page and your last saved hotels stay on the device, so the page opens in airplane mode. This
works after one launch with a network (open the page once after each update).

On an iPhone, Chrome and Safari both use Apple's web engine. It can delete the saved hotels of a
site that you have not opened for 7 days. A Home Screen app is kept. So:

1. Open the site in Chrome (iOS 16.4 or later). Tap Share, then `Add to Home Screen`, then `Add`.
   (In Safari: Share, `Add to Home Screen`, and keep `Open as Web App` on.) The icon must open
   full screen, with no address bar. If it opens in a browser tab, remove the icon and add it again.
2. Always open Layover hotels from the Home Screen icon. It has its own storage, so open it once
   with a network and type the password there.

## Run locally

The page uses the local Worker when it is served from `localhost`, so a local run never changes
the real hotels.

```bash
cd worker && npm ci && npx wrangler dev --ip 127.0.0.1 --port 8788
```

```bash
npx http-server@14.1.1 -p 8766 -c-1
```

Open `http://localhost:8766/`. The local Worker starts empty.

Browsers run a service worker (the offline copy) only on servers that the preview tool starts. If you
test offline use, start the servers with the preview tool (`.claude/launch.json`).

## Test

```bash
node --test "test/*.test.js"
```

```bash
cd worker && npm test
```
