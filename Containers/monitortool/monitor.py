import time
from datetime import datetime
from pymongo import MongoClient
import os

# Use the DBHOST from environment, default to "dbstorage"
dbhost = os.getenv("DBHOST", "dbstorage")
client = MongoClient(f"mongodb://{dbhost}:27017")

DB_NAME = "cloneDetector"
POLL_INTERVAL = 5
db = client[DB_NAME]

collections = ["files", "chunks", "candidates", "clones"]
last_seen_time = None

print("MonitorTool started")

while True:
    # Count documents in main collections
    counts = {c: db[c].count_documents({}) for c in collections}
    print(f"[{datetime.now()}] COUNTS {counts}")

    # Fetch new status updates
    query = {}
    if last_seen_time:
        query = {"timestamp": {"$gt": last_seen_time}}

    updates = list(db["statusUpdates"].find(query).sort("timestamp", 1))
    for u in updates:
        print(f"[{u['timestamp']}] {u['message']}")

    if updates:
        last_seen_time = updates[-1]["timestamp"]

    time.sleep(POLL_INTERVAL)
