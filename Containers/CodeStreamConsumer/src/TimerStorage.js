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
        // Flatten all file timers into a single array
        const fileTimers = Object.values(this.files).flat();

        // Log for debugging purposes
        console.log(`Total timers in storage: ${fileTimers.length}`);
        console.log(`Returning last ${n} timers: `, fileTimers.slice(-n));

        // Return the last `n` timers
        return fileTimers.slice(-n);
    }

    // Method to calculate average of the last `n` timers (example: average execution time)
    average(timers) {
        if (timers.length === 0) return 0;

        const totalTime = timers.reduce((sum, timer) => sum + timer.totalMicro, 0);
        return totalTime / timers.length;
    }

    // Method to calculate average time per line
    averagePerLine(timers) {
        if (timers.length === 0) return 0;

        const totalLines = timers.reduce((sum, timer) => sum + timer.numLines, 0);
        const totalTime = timers.reduce((sum, timer) => sum + timer.totalMicro, 0);
        return totalTime / totalLines; // Average time per line in microseconds
    }

    // Store a new timer for a given file
    addRecord(filename, totalMicro, numLines) {
        if (!this.files[filename]) {
            this.files[filename] = [];
        }

        this.files[filename].push({
            filename,
            totalMicro,
            numLines,
            perLine: totalMicro / numLines,
            timestamp: new Date(),
        });
    }
}

// Export the class using ES Module syntax
export default TimerStorage;
