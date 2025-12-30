from flask import Flask, render_template, jsonify
from pymongo import MongoClient
from datetime import datetime

app = Flask(__name__)

# Connect to MongoDB
client = MongoClient("mongodb://bigdataanalytics-dbstorage-1:27017/")
db = client["bigdataanalytics"]  # Replace with your database name
collection = db["monitor_stats"]  # Replace with your collection name

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/data")
def data():
    # Fetch the latest 100 entries
    stats = list(collection.find().sort("timestamp", -1).limit(100))
    stats.reverse()  # Oldest first

    timestamps = [s["timestamp"] for s in stats]
    files = [s["files"] for s in stats]
    chunks = [s["chunks"] for s in stats]
    candidates = [s["candidates"] for s in stats]
    clones = [s["clones"] for s in stats]

    return jsonify({
        "timestamps": timestamps,
        "files": files,
        "chunks": chunks,
        "candidates": candidates,
        "clones": clones
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
