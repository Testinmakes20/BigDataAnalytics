import express from "express";
import formidable from "formidable";
import fs from "fs/promises";

import Timer from "./Timer.js";
import TimerStorage from "./TimerStorage.js";
import CloneDetector from "./CloneDetector.js";
import CloneStorage from "./CloneStorage.js";
import FileStorage from "./FileStorage.js";

const app = express();
const PORT = 3000;

const STATS_FREQ = 100;
const URL = process.env.URL || "http://localhost:8080/";

let lastFile = null;

/* ----------------------------------------------------------
   ROUTE: RECEIVE FILE UPLOAD (POST /)
-----------------------------------------------------------*/
app.post("/", (req, res) => {

    // IMPORTANT: Create a NEW Formidable instance per request
    const form = formidable({
        multiples: false,
        uploadDir: "/tmp",
        keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("❌ Error parsing form:", err);
            return res.status(400).send("Form parse error");
        }

        try {
            const uploaded = files.data?.filepath
                ? files.data
                : Array.isArray(files.data)
                ? files.data[0]
                : Object.values(files)[0];

            if (!uploaded || !uploaded.filepath) {
                console.error("❌ No uploaded file found!", files);
                return res.status(400).send("No file received");
            }

            const filename =
                fields.name?.[0] ||
                uploaded.originalFilename ||
                "unknown.java";

            const content = await fs.readFile(uploaded.filepath, "utf8");
            console.log(`📥 Received file: ${filename}, size: ${content.length} bytes`);

            await processFile(filename, content);

            res.status(200).send("OK");
        } catch (error) {
            console.error("❌ Error processing file:", error);
            res.status(500).send("Internal error");
        }
    });
});

/* ----------------------------------------------------------
   ROUTE: LANDING PAGE — show clones
-----------------------------------------------------------*/
app.get("/", (req, res) => {
    let page = `
    <html><head><title>CodeStream Clone Detector</title></head>
    <body>
      <h1>CodeStream Clone Detector</h1>
      <p>${getStatistics()}</p>
      ${lastFileTimersHTML()}
      ${listClonesHTML()}
      ${listProcessedFilesHTML()}
      <hr>
      <p><a href="/timers">View timing statistics →</a></p>
    </body></html>
    `;
    res.send(page);
});

/* ----------------------------------------------------------
   ROUTE: TIMING STATS PAGE (/timers)
-----------------------------------------------------------*/
app.get("/timers", (req, res) => {
    const ts = TimerStorage.getInstance();
    const last100 = ts.last(100);
    const avg = ts.average(last100);
    const avgPerLine = ts.averagePerLine(last100);

    let rows = last100
        .map(
            (r) => `
        <tr>
            <td>${r.filename}</td>
            <td>${r.totalMicro.toFixed(0)}</td>
            <td>${r.numLines}</td>
            <td>${r.perLine.toFixed(2)}</td>
            <td>${r.timestamp.toLocaleTimeString()}</td>
        </tr>`
        )
        .join("");

    let html = `
    <html><head><title>Timing Stats</title></head>
    <body>
        <h1>Timing Statistics</h1>

        <p>Last ${last100.length} files</p>

        <p><b>Average time:</b> ${avg.toFixed(0)} μs</p>
        <p><b>Average per line:</b> ${avgPerLine.toFixed(2)} μs/line</p>

        <table border="1" cellspacing="0" cellpadding="5">
            <tr>
                <th>Filename</th>
                <th>Total μs</th>
                <th>Lines</th>
                <th>μs per line</th>
                <th>Time</th>
            </tr>
            ${rows}
        </table>

        <p><a href="/">← Back</a></p>
    </body></html>
    `;
    res.send(html);
});

/* ----------------------------------------------------------
   FILE PROCESSING PIPELINE
-----------------------------------------------------------*/
async function processFile(filename, contents) {
    try {
        const cloneDetector = new CloneDetector();
        const cloneStore = CloneStorage.getInstance();
        const timerStore = TimerStorage.getInstance();

        if (!filename || !contents) {
            console.error("❌ Invalid file input", filename, contents?.length);
            return;
        }

        let file = { name: filename, contents, timers: {} };

        Timer.startTimer(file, "total");

        file = await cloneDetector.preprocess(file);
        file = cloneDetector.transform(file);

        Timer.startTimer(file, "match");
        file = cloneDetector.matchDetect(file);
        cloneStore.storeClones(file);
        Timer.endTimer(file, "match");

        file = cloneDetector.storeFile(file);

        Timer.endTimer(file, "total");

        lastFile = file;

        // Save timing data
        const timers = Timer.getTimers(file);
        const total = timers.total || 0n;
        const numLines = contents.split("\n").length;

        timerStore.addRecord(filename, total, numLines);

        if (cloneDetector.numberOfProcessedFiles % STATS_FREQ === 0) {
            console.log(`Processed ${cloneDetector.numberOfProcessedFiles} files, found ${cloneStore.numberOfClones} clones.`);
            console.log(`Timing: total ${Number(total) / 1000} μs`);
            console.log(`See: ${URL}`);
        }

    } catch (err) {
        console.error("❌ Error processing file:", err);
    }
}

/* ----------------------------------------------------------
   VIEW HELPERS
-----------------------------------------------------------*/
function getStatistics() {
    const cloneStore = CloneStorage.getInstance();
    const fs = FileStorage.getInstance();
    return `Processed ${fs.numberOfFiles} files containing ${cloneStore.numberOfClones} clones.`;
}

function lastFileTimersHTML() {
    if (!lastFile) return "";
    let html = `<h2>Timers for last file: ${lastFile.name}</h2><ul>`;
    const timers = Timer.getTimers(lastFile);
    for (let key in timers) {
        html += `<li>${key}: ${Number(timers[key]) / 1000} μs</li>`;
    }
    html += "</ul>";
    return html;
}

function listClonesHTML() {
    const cloneStore = CloneStorage.getInstance();
    let html = "";

    cloneStore.clones.forEach((clone) => {
        html += `<hr><h2>Source File: ${clone.sourceName}</h2>`;
        html += `<p>Lines ${clone.sourceStart}–${clone.sourceEnd}</p><ul>`;

        clone.targets.forEach((target) => {
            html += `<li>Found in ${target.name} at line ${target.startLine}</li>`;
        });

        html += "</ul>";
        html += `<pre><code>${clone.originalCode}</code></pre>`;
    });

    return html;
}

function listProcessedFilesHTML() {
    const fs = FileStorage.getInstance();
    let html = `<hr><h2>Processed Files</h2><ul>`;
    fs.filenames.forEach((name) => {
        html += `<li>${name}</li>`;
    });
    html += "</ul>";
    return html;
}

/* ----------------------------------------------------------
   START SERVER
-----------------------------------------------------------*/
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ CodeStreamConsumer running on port ${PORT}`);
});
