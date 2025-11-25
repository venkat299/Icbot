
# Interview Chatbot

## Prerequisites

- Node.js and npm
- Python 3

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
