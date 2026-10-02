#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  echo "Node.js est nécessaire pour ouvrir Playlist Jam."
  read -k 1
  exit 1
fi
if curl -fsS http://localhost:4317/api/library >/dev/null 2>&1; then
  open http://localhost:4317
  exit 0
fi
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
node server.mjs &
playlist_pid=$!
trap 'kill "$playlist_pid" 2>/dev/null' EXIT INT TERM
for attempt in {1..40}; do
  if curl -fsS http://localhost:4317/api/library >/dev/null 2>&1; then
    open http://localhost:4317
    break
  fi
  sleep 0.25
done
wait "$playlist_pid"
