class CloneStorage {
    static #myInstance = null;

    // Singleton pattern to get the instance
    static getInstance() {
        CloneStorage.#myInstance = CloneStorage.#myInstance || new CloneStorage();
        return CloneStorage.#myInstance;
    }

    #myClones = [];

    // Getter for number of clones
    get numberOfClones() { return this.#myClones.length; }

    // Helper method to extract the original code from the file contents
    #extractOriginalCode(contents, startLine, endLine) {
        return contents.split('\n').slice(startLine-1, endLine).join('\n');
    }

    // Store clones in the storage
    storeClones(file) {
        let instances = file.instances || [];
        if (0 < instances.length) {
            instances = instances.map(clone => {
                clone.originalCode = this.#extractOriginalCode(file.contents, clone.sourceStart, clone.sourceEnd);
                return clone;
            });

            // Add the clones to the storage
            this.#myClones = this.#myClones.concat(instances);
        }
        return file;
    }

    // Getter for clones (returns the stored clones)
    get clones() { return this.getClones(); }

    // Get all the clones
    getClones() { return this.#myClones; }
}

// Export the CloneStorage class as the default export
export default CloneStorage;
