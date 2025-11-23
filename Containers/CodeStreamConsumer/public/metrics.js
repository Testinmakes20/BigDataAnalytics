async function loadMetrics() {
    const data = await (await fetch('/metrics-data')).json();

    drawClonesPerFile(data);
    drawAvgCloneLength(data);
    drawPercentLinesCloned(data);
}

function drawClonesPerFile(data) {
    new Chart(document.getElementById('clonesPerFile'), {
        type: 'bar',
        data: {
            labels: data.files,
            datasets: [{ label: 'Number of Clones', data: data.cloneCounts }]
        }
    });
}

function drawAvgCloneLength(data) {
    new Chart(document.getElementById('avgCloneLength'), {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{ label: 'Avg Clone Length', data: data.avgCloneLengths }]
        }
    });
}

function drawPercentLinesCloned(data) {
    new Chart(document.getElementById('percentLinesCloned'), {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{ label: '% Lines Cloned', data: data.percentLines }]
        }
    });
}

loadMetrics();
