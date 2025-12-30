#!/bin/bash
# wait-for-mongo.sh

set -e

# MongoDB host and port from environment
DB_HOST="${DBHOST:-localhost}"
DB_PORT=27017

echo "Waiting for MongoDB at $DB_HOST:$DB_PORT..."

# Wait until MongoDB is reachable
until nc -z "$DB_HOST" "$DB_PORT"; do
  echo "MongoDB is unavailable - sleeping 2s"
  sleep 2
done

echo "MongoDB is up! Starting clone-detector..."
# Start the actual application
exec lein run
