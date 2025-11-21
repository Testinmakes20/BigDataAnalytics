import express from 'express';  // ES import syntax
import formidable from 'formidable';  // ES import syntax
import fs from 'fs/promises';  // ES import syntax

import Timer from './Timer.js';  // Add the `.js` extension for local imports
import TimerStorage from './TimerStorage.js';  // Same for local modules

import CloneDetector from './CloneDetector.js';  // Same for local modules
import CloneStorage from './CloneStorage.js';  // Same for local modules
import FileStorage from './FileStorage.js';  // Same for local modules

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
