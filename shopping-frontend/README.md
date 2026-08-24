# Listy — voice shopping list (frontend)

A responsive React UI for the voice shopping assistant backend: speak or
type a command, watch the list update, browse the catalog, and get
recommendations based on what you've bought before.

## Design

The visual idea is a grocery receipt: the shopping list is a torn paper
ticket with a dashed divider and hand-stamped checkmarks, set in a paper /
ink / fresh-leaf-green palette with a mustard accent for prices and a red
"ink stamp" for purchased items. Archivo Black carries headings, IBM Plex
Mono carries anything numeric (quantities, counts), Inter carries body copy.

Layout is mobile-first: a single column with a bottom tab bar (List / For
you / Browse) below ~860px, opening into a two-column layout (sticky list on
the left, recommendations + search on the right) on wider screens — no
separate mobile app, no JS-driven breakpoint logic beyond which tab is
active.

## Running it

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your api-gateway
npm run dev
```

Requires the backend (`api-gateway` + services) running — see the backend
project's README for `docker compose up`.

## Notes

- **Voice input** uses the browser's built-in `SpeechRecognition` API
  (Chrome/Edge). Where it's unsupported (e.g. Firefox, most non-Safari
  mobile browsers), the mic button is hidden and the bar works as a plain
  text field — no functionality is lost, just the microphone shortcut.
- **Optimistic UI**: because commands are applied asynchronously through
  Kafka, submitting one shows a placeholder row immediately and reconciles
  with the server ~1.4s later. The list and recommendations also poll every
  6s in the background so purchases/removals made elsewhere stay in sync.
- **Demo identity**: there's no auth yet on the backend, so the app assigns
  a random `guest-xxxxx` id per browser via `localStorage` and sends it as
  `userId` on every request.
