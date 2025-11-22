#!/usr/bin/env bash

CORPUS_DIR="/qc/test"  # Path to the test folder containing Java files
DELAY=${DELAY:-0}

sendFile() {
  local javafile="$1"
  echo "Sending $javafile"

  # Send the Java file to the consumer using curl
  curl -s -F "name=$(basename "$javafile")" -F "data=@$javafile" "$TARGET"
  sleep "$DELAY"
}

echo "Stream-of-Code generator streaming Java files from $CORPUS_DIR..."
sleep 5  # Give consumer time to start

# Iterate over all .java files in the corpus directory
for javafile in "$CORPUS_DIR"/*.java; do
  [ -e "$javafile" ] || continue  # Skip if no .java files found
  sendFile "$javafile"
done

echo "All files sent. Exiting."
