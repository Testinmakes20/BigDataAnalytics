const express = require('express');
const formidable = require('formidable');
const fs = require('fs/promises');
const app = express();
const PORT = 3000;

const Timer = require('./Timer');
const CloneDetector = require('./CloneDetector');
const CloneStorage = require('./CloneStorage');
const FileStorage = require('./FileStorage');

// Express and Formidable setup
// --------------------
const form = formidable({ multiples: false });

app.post('/', fileReceiver);
function fileReceiver(req, res, next) {
    form.parse(req, (err, fields, files) => {
        fs.readFile(files.data.filepath, { encoding: 'utf8' })
            .then(data => { return processFile(fields.name, data); });
    });
    return res.end('');
}

app.get('/', viewClones);

// 🆕 new route for timing statistics
app.get('/timers', viewTimers);

const server = app.listen(PORT, () => { console.log('Listening for files on port', PORT); });

// --------------------
// Page generation for viewing current progress
// --------------------
function getStatistics() {
    let cloneStore = CloneStorage.getInstance();
    let fileStore = FileStorage.getInstance();
    let output = 'Processed ' + fileStore.numberOfFiles + ' files containing ' + cloneStore.numberOfClones + ' clones.'
    return output;
}

function lastFileTimersHTML() {
    if (!lastFile) return '';
    let output = '<p>Timers for last file processed:</p>\n<ul>\n';
    let timers = Timer.getTimers(lastFile);
    for (t in timers) {
        output += '<li>' + t + ': ' + (timers[t] / (1000n)) + ' µs\n';
    }
    output += '</ul>\n';
    return output;
}

function listClonesHTML() {
    let cloneStore = CloneStorage.getInstance();
    let output = '';

    cloneStore.clones.forEach(clone => {
        output += '<hr>\n';
        output += '<h2>Source File: ' + clone.sourceName + '</h2>\n';
        output += '<p>Starting at line: ' + clone.sourceStart + ' , ending at line: ' + clone.sourceEnd + '</p>\n';
        output += '<ul>';
        
        // Iterate over targets and display meaningful properties
        clone.targets.forEach(target => {
            // Assuming each target is an object with 'name' and 'startLine'
            // Avoid displaying [object Object] by using specific properties
            output += '<li>Found in ' + (target.name || 'Unknown file') + ' starting at line ' + (target.startLine || 'Unknown line') + '</li>\n';
        });
        output += '</ul>\n';
        output += '<h3>Contents:</h3>\n<pre><code>\n';
        output += clone.originalCode;
        output += '</code></pre>\n';
    });

    return output;
}

function listProcessedFilesHTML() {
    let fs = FileStorage.getInstance();
    let output = '<HR>\n<H2>Processed Files</H2>\n'
    output += fs.filenames.reduce((out, name) => {
        out += '<li>' + name + '\n';
        return out;
    }, '<ul>\n');
    output += '</ul>\n';
    return output;
}

function viewClones(req, res, next) {
    let page = '<HTML><HEAD><TITLE>CodeStream Clone Detector</TITLE></HEAD>\n';
    page += '<BODY><H1>CodeStream Clone Detector</H1>\n';
    page += '<P>' + getStatistics() + '</P>\n';
    page += lastFileTimersHTML() + '\n';
    page += listClonesHTML() + '\n';
    page += listProcessedFilesHTML() + '\n';
    page += '<p><a href="/timers">View timing statistics</a></p>\n';
    page += '</BODY></HTML>';
    res.send(page);
}

// --------------------
// Some helper functions
// --------------------
PASS = fn => d => {
    try {
        fn(d);
        return d;
    } catch (e) {
        throw e;
    }
};

const STATS_FREQ = 100;
const URL = process.env.URL || 'http://localhost:8080/';
var lastFile = null;

// 🆕 global timing storage
let allTimers = [];

function maybePrintStatistics(file, cloneDetector, cloneStore) {
    if (0 == cloneDetector.numberOfProcessedFiles % STATS_FREQ) {
        console.log('Processed', cloneDetector.numberOfProcessedFiles, 'files and found', cloneStore.numberOfClones, 'clones.');
        let timers = Timer.getTimers(file);
        let str = 'Timers for last file processed: ';
        for (t in timers) {
            str += t + ': ' + (timers[t] / (1000n)) + ' µs ';
        }
        console.log(str);
        console.log('List of found clones available at', URL);
    }
    return file;
}

// --------------------
// Processing of the file
// --------------------
function processFile(filename, contents) {
    let cd = new CloneDetector();
    let cloneStore = CloneStorage.getInstance();

    return Promise.resolve({ name: filename, contents: contents })
        .then((file) => {
            Timer.startTimer(file, 'total');
            return cd.preprocess(file);
        })
        .then((file) => cd.transform(file))
        .then((file) => {
            Timer.startTimer(file, 'match');
            return cd.matchDetect(file);
        })
        .then((file) => cloneStore.storeClones(file))
        .then((file) => Timer.endTimer(file, 'match'))
        .then((file) => cd.storeFile(file))
        .then((file) => Timer.endTimer(file, 'total'))
        .then((file) => {
            lastFile = file;
            maybePrintStatistics(file, cd, cloneStore);
            // Store timers for each processed file
            const timers = Timer.getTimers(file);
            allTimers.push({
                name: file.name,
                total: Number(timers.total || 0n) / 1000,   // µs
                match: Number(timers.match || 0n) / 1000,
                timestamp: Date.now()
            });
            if (allTimers.length > 1000) allTimers.shift(); // Limit history to 1000
        })
        .catch((error) => {
            console.error('Error processing file:', error);
            // Optionally, send an error response to the client
            // res.status(500).send('Error processing file');
        });
}


// --------------------
// 🆕 New landing page: /timers
// --------------------
function viewTimers(req, res, next) {
    if (allTimers.length === 0) {
        return res.send("<h1>No timing data yet.</h1>");
    }

    // Calculate averages
    const avgTotal = allTimers.reduce((sum, t) => sum + t.total, 0) / allTimers.length;
    const avgMatch = allTimers.reduce((sum, t) => sum + t.match, 0) / allTimers.length;
    const last100 = allTimers.slice(-100);
    const avgTotal100 = last100.reduce((sum, t) => sum + t.total, 0) / last100.length;
    const avgMatch100 = last100.reduce((sum, t) => sum + t.match, 0) / last100.length;

    // Create HTML page
    let page = `
    <html><head><title>Timing Statistics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <h1>Timing Statistics</h1>
      <p>Processed ${allTimers.length} files</p>
      <ul>
        <li>Average total time: ${avgTotal.toFixed(2)} µs</li>
        <li>Average match time: ${avgMatch.toFixed(2)} µs</li>
        <li>Average total (last 100): ${avgTotal100.toFixed(2)} µs</li>
        <li>Average match (last 100): ${avgMatch100.toFixed(2)} µs</li>
      </ul>

      <h2>Recent files</h2>
      <table border="1" cellpadding="4">
        <tr><th>#</th><th>Filename</th><th>Total (µs)</th><th>Match (µs)</th></tr>
        ${allTimers.slice(-20).map((t, i) =>
        `<tr><td>${allTimers.length - 20 + i}</td><td>${t.name}</td><td>${t.total.toFixed(1)}</td><td>${t.match.toFixed(1)}</td></tr>`
    ).join('\n')}
      </table>

      <h2>Timing trend</h2>
      <canvas id="chart" width="800" height="300"></canvas>
      <script>
        const ctx = document.getElementById('chart').getContext('2d');
        const labels = ${JSON.stringify(allTimers.map((t, i) => i))};
        const totalData = ${JSON.stringify(allTimers.map(t => t.total))};
        const matchData = ${JSON.stringify(allTimers.map(t => t.match))};
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'Total (µs)', data: totalData, borderColor: 'blue', fill: false },
              { label: 'Match (µs)', data: matchData, borderColor: 'red', fill: false }
            ]
          }
        });
      </script>

      <p><a href="/">Back to clone summary</a></p>
    </body></html>`;

    res.send(page);
}
