#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ensure_node_modules() {
  if [ ! -d node_modules ]; then npm install; fi
}

SKIP_PYTHON_SETUP="${SKIP_PYTHON_SETUP:-0}"

ensure_python_env() {
  # If you activated a venv yourself, just keep using it.
  if [ -n "${VIRTUAL_ENV:-}" ]; then
    echo "Using pre-activated virtualenv at ${VIRTUAL_ENV}"
    return
  fi

  if [ "$SKIP_PYTHON_SETUP" = "1" ]; then
    echo "Skipping Python dependency setup (SKIP_PYTHON_SETUP=1)."
    return
  fi

  local python_bin="${PYTHON:-python3}"
  local venv_dir="${ROOT_DIR}/.venv"

  if [ ! -d "$venv_dir" ]; then
    "$python_bin" -m venv "$venv_dir"
  fi

  # shellcheck disable=SC1090
  source "${venv_dir}/bin/activate"

  if [ ! -f "${venv_dir}/.deps-installed" ]; then
    python -m pip install -e .
    touch "${venv_dir}/.deps-installed"
  fi
}


ensure_node_modules
ensure_python_env

SKIP_PYTHON_APP="${SKIP_PYTHON_APP:-0}"
PYTHON_APP_PID=""

launch_python_app() {
  if [ "$SKIP_PYTHON_APP" = "1" ]; then
    echo "Skipping Python app launch (SKIP_PYTHON_APP=1)."
    return
  fi

  local python_cmd="${PYTHON:-python}"
  if ! command -v "$python_cmd" >/dev/null 2>&1; then
    python_cmd="python3"
  fi

  if ! command -v "$python_cmd" >/dev/null 2>&1; then
    echo "Unable to locate python interpreter. Set PYTHON to a valid executable." >&2
    exit 1
  fi

  echo "Starting Python backend with ${python_cmd} main.py"
  "${python_cmd}" main.py &
  PYTHON_APP_PID=$!
}

cleanup() {
  if [ -n "$PYTHON_APP_PID" ] && kill -0 "$PYTHON_APP_PID" >/dev/null 2>&1; then
    echo "Stopping Python backend (pid $PYTHON_APP_PID)"
    kill "$PYTHON_APP_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

launch_python_app

npm run dev -- --host 0.0.0.0 --port 5173
