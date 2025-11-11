#!/usr/bin/env bash

# Function to create the list of files
createFileList() {
  echo "Creating initial list of files..."
  find /test -type f -name "*.java"
}

sendFile() {
  echo "Sending file $1 to $TARGET"
  curl -s -F "name=$1" -F "data=@$1" "$TARGET"
  sleep 0.01  # Slight delay to avoid overrunning consumer buffers
}

# Ensure DELAY is set, if not default to 0
if [[ "$DELAY" == "" ]]; then
  DELAY=0
fi

# Echo some information about the generator
echo "Stream-of-Code generator."
echo "Delay (seconds) between each file is: $DELAY"
echo "Files are sent to: $TARGET"

# Wait for the consumer to start
echo "Waiting 5 seconds to give consumer time to get started..."
sleep 5

if [[ "$1" == "TEST" ]]; then
  echo "Started with TEST argument, first sending test files..."
  sendFile ./test/A.java
  sendFile ./test/B.java
  echo "Sent test files. Sleeping before continuing..."
  sleep 10
fi

# Create the list of files from /test and save to /root/files.txt
createFileList > ~/files.txt

# Loop forever, sending each file in sequence
while true; do
  while read -r LINE; do
    sendFile "$LINE"
    sleep "$DELAY"
  done < ~/files.txt
done
