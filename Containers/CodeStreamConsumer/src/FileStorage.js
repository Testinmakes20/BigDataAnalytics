class FileStorage {
    static #myInstance = null;

    // Singleton pattern
    static getInstance() {
        if (!FileStorage.#myInstance) {
            FileStorage.#myInstance = new FileStorage();
        }
        return FileStorage.#myInstance;
    }

    // Private fields for storing files and metadata
    #myFiles = [];
    #myFileNames = [];
    #myNumberOfFiles = 0;

    constructor() {}

    // Getter methods for the number of files and file names
    get numberOfFiles() { return this.#myNumberOfFiles; }
    get filenames() { return this.#myFileNames; }

    // Check if a file has already been processed
    isFileProcessed(fileName) {
        // FIXME: Potential race condition. Improve synchronization or state management
        return this.#myFileNames.includes(fileName);
    }

    // Store a file if it hasn't been processed already
    storeFile(file) {
        if (!this.isFileProcessed(file.name)) {
            // Adding file to storage
            this.#myFileNames.push(file.name);
            this.#myNumberOfFiles++;

            // Store file in the private array
            this.#myFiles.push(file);
        }
        return file;
    }

    // Generator function to yield all files in storage
    *getAllFiles() {
        for (let file of this.#myFiles) {
            yield file;
        }
    }
}

// Use export default to use this in other modules
export default FileStorage;

