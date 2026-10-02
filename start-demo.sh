#!/bin/bash
# Starts the whole demo on the laptop's Wi-Fi address, so phones on the same Wi-Fi can open it:
#   - Web Template website (port 4000), with its Smart Search server inside
#   - Our client website and its search server, together on port 3000
#   - Expo app server (port 8081)
# If the Wi-Fi address changed, or the website was never built, it updates the app and
# rebuilds the website first.
#
# Run:  bash start-demo.sh   (from the repo folder)
# Stop: press Ctrl + C (stops everything this script started)

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)" # the repo folder this script is in
WEB="$ROOT/web-template"
SERVER="$ROOT/server"
CLIENT="$ROOT/client"
APP="$ROOT/mobile-app"
YARN="npx -y yarn@1.22.22"
BUILT_FOR="$WEB/build/.demo-url" # which address the website was last built for

IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
if [ -z "$IP" ]; then
  echo "No Wi-Fi address found. Connect to Wi-Fi and try again."
  exit 1
fi
URL="http://$IP:4000"
echo "Laptop address: $IP"

listening() { lsof -tiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# Stop old copies of the website and the app server.
pkill -f "node server/index.js" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 1

# New Wi-Fi address: point the app at it.
OLD_URL=$(grep -o "http://[0-9.]*:4000" "$APP/App.js" | head -1)
if [ "$OLD_URL" != "$URL" ]; then
  echo "Address changed ($OLD_URL -> $URL). Updating the app..."
  sed -i '' "s#$OLD_URL#$URL#" "$APP/App.js"
fi

# Rebuild the website if it was never built for this address.
if [ "$(cat "$BUILT_FOR" 2>/dev/null)" != "$URL" ]; then
  echo "Building the website for $URL (takes a few minutes)..."
  (cd "$WEB" && NODE_ENV=production REACT_APP_MARKETPLACE_ROOT_URL="$URL" $YARN run build)
  echo "$URL" > "$BUILT_FOR"
fi

PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null' EXIT

# Website in the background.
(cd "$WEB" && NODE_ENV=production PORT=4000 REACT_APP_MARKETPLACE_ROOT_URL="$URL" node server/index.js) &
PIDS+=($!)

# Our client, built as static files that our search server serves on port 3000.
echo "Building our client website..."
(cd "$CLIENT" && npm run build >/dev/null)
if listening 3000; then
  # Already running (for example your own dev server): it serves the new build as it is.
  echo "Search server already running on port 3000, using it."
else
  (cd "$SERVER" && npm start) &
  PIDS+=($!)
fi

echo
echo "Web Template website: $URL"
echo "Our client website:   http://$IP:3000"
echo "Starting the app server. Scan the QR code below with your phone."
cd "$APP" && npx expo start
