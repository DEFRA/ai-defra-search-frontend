#!/bin/bash

# Set the URL for the latest list of compromised packages
COMPROMISED_LIST_URL="https://raw.githubusercontent.com/Cobenian/shai-hulud-detect/main/compromised-packages.txt"

# Inform the user that the list is being downloaded
echo "Downloading latest compromised packages list..."

# Download the compromised packages list to a local file
curl -s "$COMPROMISED_LIST_URL" -o compromised-packages.txt

# Check if the download was successful (file exists and is not empty)
if [ ! -s compromised-packages.txt ]; then
  echo "Failed to download compromised packages list. Exiting."
  exit 1
fi

# Check if ripgrep is installed
if ! command -v rg &> /dev/null; then
  echo "Error: ripgrep (rg) is not installed. Please install it first."
  echo "  macOS: brew install ripgrep"
  echo "  Ubuntu: apt install ripgrep"
  exit 1
fi

# Build pattern file for grep -f style matching
echo "Building regex patterns from compromised packages list..."
patterns_file=$(mktemp)
trap "rm -f $patterns_file" EXIT

# Use process substitution to avoid subshell issue with while loop
while read -r line; do
  # Skip comments and empty lines
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue

  pkg=$(echo "$line" | cut -d':' -f1)
  ver=$(echo "$line" | cut -d':' -f2)

  # Escape special regex chars in package name (keep @ and / literal for scoped packages)
  escaped_pkg=$(echo "$pkg" | sed 's/[.[\*^$()+?{|]/\\&/g')
  # Escape dots in version to match literally
  escaped_ver=$(echo "$ver" | sed 's/\./\\./g')

  # Simple pattern like original script but with escaped version dots
  # Matches: pkg followed by version (with anything reasonable in between)
  echo "${escaped_pkg}.*${escaped_ver}"

done < compromised-packages.txt > "$patterns_file"

if [ ! -s "$patterns_file" ]; then
  echo "No patterns found in compromised packages list. Exiting."
  exit 1
fi

# Count lock files to be scanned
lockfile_count=$(rg --glob 'package-lock.json' --glob 'yarn.lock' --glob 'bun.lock' \
  --glob '!**/node_modules/**' \
  --files . 2>/dev/null | wc -l | tr -d ' ')

echo "
Scanning $lockfile_count lock file(s) for compromised packages...
"

# Use ripgrep with pattern file - includes bun.lock
rg --glob 'package-lock.json' --glob 'yarn.lock' --glob 'bun.lock' \
  --glob '!**/node_modules/**' \
  -n -f "$patterns_file" . 2>/dev/null

if [ $? -eq 0 ]; then
  echo "
[WARNING] Compromised packages found above!"
  echo "
Scan complete."
  exit 1
else
  echo "No compromised packages found."
  echo "
Scan complete."
fi
