#!/usr/bin/env bash

# Function to create a list of files to send
createFileList() {
  echo "Creating initial list of test files..."
  find /app/test -type f -name "*.java" | sort -R > /tmp/files.txt
}

# Function to send a file to the target server using curl
sendFile() {
  local filename
  filename=$(basename "$1")   # preserves the .java extension
  echo "Sending file: $filename"
  curl -s -F "data=@$1;filename=$filename" "$TARGET"
  sleep 0.01
}

# Default delay if not provided
: "${DELAY:=0}"

echo "Stream-of-Code generator."
echo "Delay (seconds) between each file is:" $DELAY
echo "Files are sent to                   :" $TARGET

echo "Waiting 5 seconds to give consumer time to get started..."
sleep 5

# If the first argument is "TEST", send test files first
if [[ "$1" == "TEST" ]]; then
  echo "Started with TEST argument, first sending test files..."
  sendFile /app/test/A.java
  sendFile /app/test/B.java
  echo "Sent test files. Sleeping before continuing..."
  sleep 10
fi

# Infinite repeat mode
if [[ "$1" == "REPEAT" ]]; then
  echo "Starting REPEAT mode (sending A.java then B.java indefinitely)..."
  while true; do
    sendFile /app/test/A.java
    sleep "$DELAY"
    sendFile /app/test/B.java
    sleep "$DELAY"
  done
fi

# Create a list of test files to send
createFileList

# Stream all files from /tmp/files.txt (normal mode)
while IFS= read -r LINE; do
  [[ -z "$LINE" ]] && continue
  sendFile "$LINE"
  sleep "$DELAY"
done < /tmp/files.txt

echo "No more files to send. Exiting."



