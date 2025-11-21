#!/usr/bin/env bash

CORPUS_DIR="/qc"
DELAY=${DELAY:-0}

sendFileFromTar() {
  local tarfile="$1"
  echo "Processing tar: $tarfile"
  
  # List all .java files and send each one
  tar -tf "$tarfile" | grep "\.java$" | while read javafile; do
    echo "Sending $javafile from $tarfile"
    tar -O -xf "$tarfile" "$javafile" | curl -s -F "name=$(basename "$javafile")" -F "data=@-" "$TARGET"
    sleep "$DELAY"
  done
}

echo "Stream-of-Code generator streaming Java files from tar files in $CORPUS_DIR..."
sleep 5  # give consumer time to start

# Iterate over all tar files in corpus
for tarfile in "$CORPUS_DIR"/*.tar; do
  [ -e "$tarfile" ] || continue
  sendFileFromTar "$tarfile"
done

echo "All files sent. Exiting."

