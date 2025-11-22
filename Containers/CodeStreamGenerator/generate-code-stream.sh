#!/usr/bin/env bash

# Function to create a list of files to send
createFileList() {
  echo "Creating initial list of test files..."
  # Update the path to the correct test files directory
  find BigDataAnalytics-main/BigDataAnalytics/Containers/CodeStreamGenerator/test -type f -name "*.java" | sort -R > ~/files.txt
}


# Function to send a file to the target server using curl
sendFile() {
  # Send the file using curl
  curl -s -F "name=$1" -F "data=@$1" "$TARGET"
  sleep 0.01  # A slight delay is necessary here to not overrun buffers in the consumer
}

# If the DELAY variable is not set, default to 0
if [[ "$DELAY" == "" ]]; then
 DELAY=0
fi

echo "Stream-of-Code generator."
echo "Delay (seconds) between each file is:" $DELAY
echo "Files are sent to                   :" $TARGET

# Wait for the consumer to start
echo "Waiting 5 seconds to give consumer time to get started..."
sleep 5

# If the first argument is "TEST", send test files
if [[ "$1" == "TEST" ]]; then
  echo "Started with TEST argument, first sending test files..."
  sendFile ./test/A.java
  sendFile ./test/B.java
  echo "Sent test files. Sleeping before continuing..."
  sleep 10
fi

# Create a list of test files to send
createFileList

# Send all files from the list
while read LINE; do
  sendFile $LINE
  sleep $DELAY
done < ~/files.txt

echo "No more files to send. Exiting."

