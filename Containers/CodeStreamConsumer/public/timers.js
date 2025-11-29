async function loadTimingData() {
    const resp = await fetch('/timers-data');
    const data = await resp.json();

    drawTotalTime(data);
    drawPerLineTime(data);
}

function drawTotalTime(data) {
    new Chart(document.getElementById('totalTimeChart'), {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{
                label: 'Total Time (μs)',
                data: data.totalTimes,
                fill: false,
                borderColor: 'blue',
                tension: 0.2
            }]
        },
        options: {
            scales: {
                y: { title: { display: true, text: 'μs' } },
                x: { title: { display: true, text: 'File' } }
            }
        }
    });
}

function drawPerLineTime(data) {
    new Chart(document.getElementById('perLineChart'), {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{
                label: 'Time per Line (μs/line)',
                data: data.perLineTimes,
                fill: false,
                borderColor: 'green',
                tension: 0.2
            }]
        },
        options: {
            scales: {
                y: { title: { display: true, text: 'μs/line' } },
                x: { title: { display: true, text: 'File' } }
            }
        }
    });
}

window.addEventListener('load', loadTimingData);
