#!/usr/bin/env bash
# Fix-Damaged-App.command
# Removes macOS Gatekeeper quarantine attribute from Bruno Plus.

set -e

echo "=========================================================="
echo "          Bruno Plus - macOS Quarantine Fixer             "
echo "=========================================================="
echo ""

APP_PATH="/Applications/Bruno Plus.app"

# If not found in /Applications, check current folder or ~/Downloads
if [ ! -d "$APP_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -d "$SCRIPT_DIR/Bruno Plus.app" ]; then
    APP_PATH="$SCRIPT_DIR/Bruno Plus.app"
  elif [ -d "$HOME/Downloads/Bruno Plus.app" ]; then
    APP_PATH="$HOME/Downloads/Bruno Plus.app"
  fi
fi

if [ -d "$APP_PATH" ]; then
  echo "Found application at:"
  echo "  $APP_PATH"
  echo ""
  echo "Removing quarantine attributes..."
  xattr -cr "$APP_PATH"
  echo ""
  echo "✓ Done! Quarantine attributes removed."
  echo "You can now open Bruno Plus normally."
else
  echo "✕ Error: Could not locate 'Bruno Plus.app'."
  echo ""
  echo "Please follow these steps:"
  echo "1. Open the downloaded DMG file."
  echo "2. Drag 'Bruno Plus' into your Applications folder."
  echo "3. Run this script again."
fi

echo ""
read -p "Press [Enter] to exit..."

