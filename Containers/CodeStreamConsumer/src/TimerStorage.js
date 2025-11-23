class TimerStorage {
    // Singleton pattern
    static instance = null;

    constructor() {
        if (TimerStorage.instance) {
            return TimerStorage.instance; // Return the existing instance
        }

        this.files = {}; // Stores timers for each file
        TimerStorage.instance = this; // Assign instance
    }

    static getInstance() {
        return TimerStorage.instance || new TimerStorage();
    }

    // Add or get timers for a specific file by its ID
    getFileTimers(fileId) {
        if (!this.files[fileId]) {
            this.files[fileId] = []; // Initialize an empty array if no timers exist for the file
        }
        return this.files[fileId];
    }

    // Get the last `n` timers across all files
    last(n = 1) {
        const fileTimers = Object.values(this.files).flat();
        return fileTimers.slice(-n);
    }

    // Method to calculate average of the last `n` timers
    average(timers) {
        if (timers.length === 0) return 0;
        const totalTime = timers.reduce((sum, timer) => sum + Number(timer.totalMicro), 0);
        return totalTime / timers.length;
    }

    // Method to calculate average time per line
    averagePerLine(timers) {
        if (timers.length === 0) return 0;
        const totalLines = timers.reduce((sum, timer) => sum + Number(timer.numLines), 0);
        const totalTime = timers.reduce((sum, timer) => sum + Number(timer.totalMicro), 0);
        return totalTime / totalLines;
    }

    // Store a new timer for a given file, with live logging
    addRecord(filename, totalMicro, numLines) {
        if (!this.files[filename]) {
            this.files[filename] = [];
        }

        const record = {
            filename,
            totalMicro: Number(totalMicro),
            numLines: Number(numLines),
            perLine: Number(totalMicro) / Number(numLines),
            timestamp: new Date(),
        };

        this.files[filename].push(record);

        // Live log for real-time monitoring
        console.log(`🕒 New timer added for ${filename}: total=${record.totalMicro}µs, lines=${record.numLines}, perLine=${record.perLine.toFixed(2)}µs`);
    }
}

export default TimerStorage;
