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

    last(n = 1) {
        // Convert this.files to an array and get the last N timers
        const fileTimers = Object.values(this.files).flat();
        return fileTimers.slice(-n);
    }
}

export default TimerStorage;
