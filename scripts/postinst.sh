#!/bin/sh
set -e

# The executable is in the /usr/lib/cure-contributors directory
CLI_EXECUTABLE="/usr/lib/cure-contributors/resources/cure-contributors"
MAIN_EXECUTABLE="/usr/lib/cure-contributors/cure-contributors"

# Remove existing symlink if it exists
rm -f /usr/local/bin/cure-contributors

# Ensure executables have correct permissions
chmod 755 "$CLI_EXECUTABLE"
chmod 755 "$MAIN_EXECUTABLE"

# Create new symlink only if the executable exists
if [ -f "$CLI_EXECUTABLE" ]; then
    ln -s "$CLI_EXECUTABLE" /usr/local/bin/cure-contributors
else
    echo "Error: CLI executable not found at $CLI_EXECUTABLE"
    exit 1
fi