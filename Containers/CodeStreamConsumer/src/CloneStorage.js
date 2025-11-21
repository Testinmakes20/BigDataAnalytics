class CloneStorage {
    static #myInstance = null;

    static getInstance() {
        CloneStorage.#myInstance = CloneStorage.#myInstance || new CloneStorage();
        return CloneStorage.#myInstance;
    }

    #myClones = [];

    get numberOfClones() {
        return this.#myClones.length;
    }

    #extractOriginalCode(contents, startLine, endLine) {
        return contents.split('\n').slice(startLine - 1, endLine).join('\n');
    }

    storeClones(file) {
        let instances = file.instances || [];
        if (instances.length > 0) {
            instances = instances.map(clone => {
                clone.originalCode = this.#extractOriginalCode(file.contents, clone.sourceStart, clone.sourceEnd);
                return clone;
            });

            // Add the clones to the storage
            this.#myClones = this.#myClones.concat(instances);
        }
        return file;
    }

    get clones() {
        return this.#myClones;
    }

    getClones() {
        return this.#myClones;
    }
}

export default CloneStorage;
