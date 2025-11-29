async function loadTimingData() {
    try {
        const resp = await fetch('/timers-data');
        if (!resp.ok) throw new Error('bad response ' + resp.status);
        const data = await resp.json();

        drawTotalTime(data);
        drawPerLineTime(data);
    } catch (err) {
        console.error('Failed to load timing data:', err);
    }
}

function drawTotalTime(data) {
    const ctx = document.getElementById('totalTimeChart').getContext('2d');
    // Destroy existing chart instance if reloading (optional safety)
    if (window._totalChart) window._totalChart.destroy();

    window._totalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{
                label: 'Total Time (μs)',
                data: data.totalTimes,
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            scales: {
                y: { title: { display: true, text: 'μs' } },
                x: { title: { display: true, text: 'File' } }
            },
            plugins: { legend: { display: true } }
        }
    });
}

function drawPerLineTime(data) {
    const ctx = document.getElementById('perLineChart').getContext('2d');
    if (window._perLineChart) window._perLineChart.destroy();

    window._perLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.files,
            datasets: [{
                label: 'Time per Line (μs/line)',
                data: data.perLineTimes,
                fill: false,
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
