#!/bin/sh
set -e

# Remove symlink if it exists
if [ -L "/usr/local/bin/cure-contributors" ]; then
    rm -f /usr/local/bin/cure-contributors
fi