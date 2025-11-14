class TimerStorage {
    constructor() {
        if (TimerStorage.instance) {
            return TimerStorage.instance; // Singleton pattern
        }
        this.files = {}; // Storage for timers for each file
        TimerStorage.instance = this;
    }

    static getInstance() {
        return new TimerStorage();
    }

    // Add or get timers for a specific file
    getFileTimers(fileId) {
        if (!this.files[fileId]) {
            this.files[fileId] = [];
        }
        return this.files[fileId];
    }

}

module.exports = TimerStorage;
