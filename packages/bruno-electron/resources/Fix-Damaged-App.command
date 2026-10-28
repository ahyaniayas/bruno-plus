#!/usr/bin/env bash
# Fix-Damaged-App.command
# Removes macOS Gatekeeper quarantine attribute from Bruno Plus.

set -e

echo "=========================================================="
echo "          Bruno Plus - macOS Quarantine Fixer             "
echo "=========================================================="
echo ""

APP_PATH="/Applications/Bruno Plus.app"

# If not found in /Applications, check ~/Applications or ~/Downloads
if [ ! -d "$APP_PATH" ]; then
  if [ -d "$HOME/Applications/Bruno Plus.app" ]; then
    APP_PATH="$HOME/Applications/Bruno Plus.app"
  elif [ -d "$HOME/Downloads/Bruno Plus.app" ]; then
    APP_PATH="$HOME/Downloads/Bruno Plus.app"
  fi
fi

if [ -d "$APP_PATH" ]; then
  echo "Found application at:"
  echo "  $APP_PATH"
  echo ""
  echo "Removing macOS quarantine attribute..."
  xattr -cr "$APP_PATH"
  echo ""
  echo "✓ Successfully fixed! Quarantine attribute removed."
  echo "You can now launch Bruno Plus normally."
else
  echo "✕ Bruno Plus was not found in /Applications!"
  echo ""
  echo "Please follow these steps:"
  echo "1. First, drag 'Bruno Plus.app' into your 'Applications' folder."
  echo "2. Once copied, run this script again."
fi

echo ""
read -p "Press [Enter] to exit..."
