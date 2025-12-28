import time
from datetime import datetime
from pymongo import MongoClient

DB_NAME = "cloneDetector"
POLL_INTERVAL = 5

client = MongoClient("mongodb://mongo:27017")
db = client[DB_NAME]

collections = ["files", "chunks", "candidates", "clones"]
last_seen_time = None

print("MonitorTool started")

while True:
    counts = {c: db[c].count_documents({}) for c in collections}
    print(f"[{datetime.now()}] COUNTS {counts}")

    query = {}
    if last_seen_time:
        query = {"timestamp": {"$gt": last_seen_time}}

    updates = list(db["statusUpdates"].find(query).sort("timestamp", 1))
    for u in updates:
        print(f"[{u['timestamp']}] {u['message']}")

    if updates:
        last_seen_time = updates[-1]["timestamp"]

    time.sleep(POLL_INTERVAL)
