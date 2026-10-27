# Deploying Reed

Reed is a single Node service: it serves the API **and** the built React frontend on one URL, so the
Nebius key stays server-side and the browser never sees it. Any host that runs a long-lived Node process
works. Serverless platforms (Vercel/Netlify functions) do **not** — a Nemotron turn takes ~13–22s, past
their ~10s function timeout.

## Recommended: Render (free tier, no credit card)

1. Create/sign in at <https://render.com> and connect the GitHub repo.
2. New → **Blueprint** → pick this repo. Render reads [`render.yaml`](./render.yaml) and configures the
   build/start commands and the non-secret env vars automatically.
3. Set the two **secret** env vars (both are your Nebius Token Factory key):
   - `BIG_API_KEY`
   - `FAST_API_KEY`
4. Deploy. The first build runs the Vite build and installs the server; the service comes up at
   `https://reed-companion.onrender.com` (or similar).

### Known free-tier caveats (fine for a demo, worth knowing)
- **Cold start:** the free service sleeps after ~15 min idle and takes ~30s to wake on the next hit.
- **Latency:** each turn is ~13–22s — the Nemotron tiers *reason* before answering. A real deployment
  would trim this (e.g. drop reasoning on the guard-out pass).
- **Memory is ephemeral:** per-child files live on the instance disk, which resets on redeploy/sleep.
  Fine for a demo; a production build would use a persistent store.

## Manual / other hosts (Railway, Fly, a VPS)

```bash
# build the frontend, then run the server (which serves it)
cd frontend && npm install && npm run build
cd ../server && npm install
MODEL_PROVIDER=nebius \
BIG_BASE_URL=https://api.studio.nebius.com/v1 BIG_MODEL=nvidia/nemotron-3-super-120b-a12b \
FAST_BASE_URL=https://api.studio.nebius.com/v1 FAST_MODEL=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B \
BIG_API_KEY=*** FAST_API_KEY=*** \
node src/server.js
```

The server listens on `$PORT` (default 4310).
