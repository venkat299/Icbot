
# Interview Chatbot

## Prerequisites

- Node.js and npm
- Python 3

## Configure local LLM URL

The backend calls an OpenAI-compatible local LLM using routes defined in `app_config.json` under `llm.routes`.

- Update the `"base_url"` for each route (for example `http://localhost:1234/v1`) to match your local LLM server.
- Optionally adjust `"model"` to the model id exposed by your server.
- Keep `"endpoint"` aligned with your server’s chat completions path (for OpenAI-style APIs this is usually `/v1/chat/completions`).

Changes to `app_config.json` are picked up on backend restart; no code changes are required.

## Start the app (recommended)

From the project root:

```bash
./start-app.sh
```

This script:
- Installs Node dependencies if `node_modules` is missing.
- Creates/activates `.venv` and installs Python deps.
- Starts the Python backend and Vite dev server on `http://localhost:5173`.

Optional environment variables:
- `SKIP_PYTHON_SETUP=1` to skip creating/installing the Python venv.
- `SKIP_PYTHON_APP=1` to skip launching the Python backend.

## Manual dev start (alternative)

If you prefer not to use `start-app.sh`:

```bash
npm install
python3 -m icbot_backend.main   # FastAPI backend on http://127.0.0.1:8000
npm run dev -- --host 0.0.0.0 --port 5173   # Vite UI on http://127.0.0.1:5173
```
