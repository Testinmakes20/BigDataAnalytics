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
        console.log(`Total timers in storage: ${fileTimers.length}`);
        console.log(`Returning last ${n} timers: `, fileTimers.slice(-n));
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
        if (totalLines === 0) return 0;

        const totalTime = timers.reduce((sum, timer) => sum + Number(timer.totalMicro), 0);
        return totalTime / totalLines;
    }

    // Store a new timer for a given file
    addRecord(filename, totalMicro, numLines) {
        if (!this.files[filename]) {
            this.files[filename] = [];
        }

        const totalMicroNumber = Number(totalMicro);
        const numLinesNumber = Number(numLines);

        this.files[filename].push({
            filename,
            totalMicro: totalMicroNumber,
            numLines: numLinesNumber,
            perLine: numLinesNumber > 0 ? totalMicroNumber / numLinesNumber : 0,
            timestamp: new Date(),
        });
    }
}

// Export the class using ES Module syntax
export default TimerStorage;
