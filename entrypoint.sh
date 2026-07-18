#!/bin/sh

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting with UID: $PUID, GID: $PGID"

# Modify the node user/group to match the requested IDs
groupmod -o -g "$PGID" node
usermod -o -u "$PUID" node

# Ensure the directories are owned by the updated UID/GID
chown -R node:node /config /app

# Run the provided command as the node user
exec su-exec node "$@"
