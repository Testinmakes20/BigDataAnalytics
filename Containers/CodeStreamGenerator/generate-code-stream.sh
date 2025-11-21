createFileList() {
  echo "Creating initial list of files..."
  # List only .java files from /qc
  find /qc -type f -name "*.java" | sort -R > /app/files.txt
}

sendFile() {
  echo "Sending file: $1"  # Debug: log which file is being sent
  curl -s -F "name=$(basename $1)" -F "data=@$1" "$TARGET"
  sleep 0.01
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
  sendFile /qc/A.java  # Adjust paths if your test files are inside /qc
  sendFile /qc/B.java
  echo "Sent test files. Sleeping before continuing..."
  sleep 10
fi

createFileList

while read LINE; do
  sendFile "$LINE"
  sleep $DELAY
done < /app/files.txt

echo "No more files to send. Exiting."
