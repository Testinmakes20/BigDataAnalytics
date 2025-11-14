#!/usr/bin/env bash

createFileList() {
  echo "Creating initial list of files..."
  find /QualitasCorpus/QualitasCorpus-20130901r/Systems -type f -name "*.java" | sort -R > /app/files.txt
}

sendFile() {
  echo "Sending file: $1"  # Debug: log which file is being sent
  curl -s -F "name=$1" -F "data=@$1" "$TARGET"
  sleep 0.01  # A slight delay to prevent overrun
}

if [[ "$DELAY" == "" ]]; then
 DELAY=0
fi

echo "Stream-of-Code generator."
echo "Delay (seconds) between each file is: $DELAY"
echo "Files are sent to: $TARGET"

echo "Waiting 5 seconds to give consumer time to get started..."
sleep 5

if [[ "$1" == "TEST" ]]; then
  echo "Started with TEST argument, first sending test files..."
  sendFile /app/Containers/CodeStreamGenerator/test/A.java  # Absolute path to the test file
  sendFile /app/Containers/CodeStreamGenerator/test/B.java  # Absolute path to the test file
  echo "Sent test files. Sleeping before continuing..."
  sleep 10
fi

createFileList

# Use absolute path to files.txt to avoid issues with tilde (~)
while read LINE; do
  sendFile "$LINE"
  sleep $DELAY
done < /app/files.txt  # Absolute path to files.txt

echo "No more files to send. Exiting."
