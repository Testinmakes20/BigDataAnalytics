import os
import time
from datetime import datetime
from threading import Thread, Event

from flask import Flask, jsonify, Response
from pymongo import MongoClient

# =========================
# Configuration
# =========================
DBHOST = os.getenv("DBHOST", "dbstorage")
DBNAME = os.getenv("DBNAME", "cloneDetector")
POLL_INTERVAL = 10 # seconds

client = MongoClient(f"mongodb://{DBHOST}:27017/")
db = client[DBNAME]

collections = ["files", "chunks", "candidates", "clones"]

samples = []
stop_event = Event()

# =========================
# Sampling logic
# =========================
def collect_sample():
    label = datetime.utcnow().strftime("%H:%M:%S")
    counts = {c: db[c].estimated_document_count() for c in collections}

    samples.append({
        "time": label,
        "counts": counts
    })

    # keep last 200 samples
    if len(samples) > 200:
        samples.pop(0)

def sampler():
    while not stop_event.is_set():
        collect_sample()
        stop_event.wait(POLL_INTERVAL)

# =========================
# Flask app
# =========================
app = Flask(__name__)

@app.route("/stats")
def stats():
    return jsonify(samples)

HTML = """
<!doctype html>
<html>
<head>
<title>Clone Detector Monitor CLJ</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; }
canvas { width: 100%; height: 260px; border: 1px solid #aaa; margin-bottom: 40px; }
h2 { margin-bottom: 5px; }
h3 { margin-top: 40px; }
</style>
</head>

<body>

<h2>Clone Detector – Execution Monitoring</h2>
<p>
<b>X-axis:</b> Time (HH:MM:SS) &nbsp;&nbsp;
<b>Y-axis:</b> Number of items
</p>

<h3>Files</h3>
<canvas id="files"></canvas>

<h3>Chunks</h3>
<canvas id="chunks"></canvas>

<h3>Clone Candidates</h3>
<canvas id="candidates"></canvas>

<h3>Clones</h3>
<canvas id="clones"></canvas>

<script>
const colors = {
  files: "#4bc0c0",
  chunks: "#ff9f40",
  candidates: "#ff6384",
  clones: "#36a2eb"
};

function draw(canvasId, labels, values, color) {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext("2d");

  c.width = c.clientWidth;
  c.height = c.clientHeight;

  const pad = 50;
  ctx.clearRect(0, 0, c.width, c.height);

  const minY = Math.min(...values);
  const maxY = Math.max(...values);

  function x(i) {
    return pad + i * (c.width - 2 * pad) / (labels.length - 1 || 1);
  }

  function y(v) {
    return c.height - pad -
      (v - minY) * (c.height - 2 * pad) / (maxY - minY || 1);
  }

  // Axes
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(pad, 10);
  ctx.lineTo(pad, c.height - pad);
  ctx.lineTo(c.width - pad, c.height - pad);
  ctx.stroke();

  // Y-axis labels + grid
  ctx.font = "12px Arial";
  ctx.fillStyle = "#000";
  for (let i = 0; i <= 4; i++) {
    let v = minY + (maxY - minY) * i / 4;
    let yy = y(v);
    ctx.fillText(v.toFixed(0), 5, yy + 4);

    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(c.width - pad, yy);
    ctx.stroke();
  }

  // X-axis labels
  let step = Math.max(1, Math.floor(labels.length / 6));
  labels.forEach((lbl, i) => {
    if (i % step === 0) {
      ctx.fillText(lbl, x(i) - 18, c.height - pad + 20);
    }
  });

  // Line
  ctx.strokeStyle = color;
  ctx.beginPath();
  values.forEach((v, i) => {
    if (i === 0) ctx.moveTo(x(i), y(v));
    else ctx.lineTo(x(i), y(v));
  });
  ctx.stroke();

  // Dots
  ctx.fillStyle = color;
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function refresh() {
  fetch("/stats")
    .then(r => r.json())
    .then(data => {
      const labels = data.map(s => s.time);

      draw("files", labels, data.map(s => s.counts.files), colors.files);
      draw("chunks", labels, data.map(s => s.counts.chunks), colors.chunks);
      draw("candidates", labels, data.map(s => s.counts.candidates), colors.candidates);
      draw("clones", labels, data.map(s => s.counts.clones), colors.clones);
    });
}

refresh();
setInterval(refresh, 5000);
</script>

</body>
</html>
"""

@app.route("/")
def index():
    return Response(HTML, mimetype="text/html")

# =========================
# Main
# =========================
if __name__ == "__main__":
    Thread(target=sampler, daemon=True).start()
    app.run(host="0.0.0.0", port=5000)
