import SourceLine from './SourceLine.js'; // Importing SourceLine using ES Module syntax
import FileStorage from './FileStorage.js'; // Importing FileStorage using ES Module syntax
import Clone from './Clone.js'; // Importing Clone using ES Module syntax

const emptyLine = /^\s*$/;
const oneLineComment = /\/\/.*/;
const oneLineMultiLineComment = /\/\*.*?\*\//;
const openMultiLineComment = /\/\*+[^\*\/]*$/;
const closeMultiLineComment = /^[\*\/]*\*+\//;

const DEFAULT_CHUNKSIZE = 5;

class CloneDetector {
    #myChunkSize = process.env.CHUNKSIZE || DEFAULT_CHUNKSIZE;
    #myFileStore = FileStorage.getInstance();

    constructor() {
    }

    // Private Methods
    // --------------------
    #filterLines(file) {
        let lines = file.contents.split('\n');
        let inMultiLineComment = false;
        file.lines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (inMultiLineComment) {
                if (-1 != line.search(closeMultiLineComment)) {
                    line = line.replace(closeMultiLineComment, '');
                    inMultiLineComment = false;
                } else {
                    line = '';
                }
            }

            line = line.replace(emptyLine, '');
            line = line.replace(oneLineComment, '');
            line = line.replace(oneLineMultiLineComment, '');
            
            if (-1 != line.search(openMultiLineComment)) {
                line = line.replace(openMultiLineComment, '');
                inMultiLineComment = true;
            }

            file.lines.push(new SourceLine(i + 1, line.trim()));
        }

        return file;
    }

    #getContentLines(file) {
        return file.lines.filter(line => line.hasContent());
    }

    #chunkify(file) {
        let chunkSize = this.#myChunkSize;
        let lines = this.#getContentLines(file);
        file.chunks = [];

        for (let i = 0; i <= lines.length - chunkSize; i++) {
            let chunk = lines.slice(i, i + chunkSize);
            file.chunks.push(chunk);
        }
        return file;
    }
    
    #chunkMatch(first, second) {
        let match = true;

        if (first.length != second.length) {
            match = false;
        }
        for (let idx = 0; idx < first.length; idx++) {
            if (!first[idx].equals(second[idx])) {
                match = false;
            }
        }

        return match;
    }

    #filterCloneCandidates(file, compareFile) {
        // TODO
        // For each chunk in file.chunks, find all #chunkMatch() in compareFile.chunks
        // For each matching chunk, create a new Clone.
        // Store the resulting (flat) array in file.instances.
        //
        // Return: file, including file.instances which is an array of Clone objects (or an empty array).
        let newInstances = []; // Placeholder for new instances of clones.
        file.instances = file.instances || [];
        file.instances = file.instances.concat(newInstances);
        return file;
    }

    #expandCloneCandidates(file) {
        // TODO
        // For each Clone in file.instances, try to expand it with every other Clone
        // (using Clone::maybeExpandWith(), which returns true if it could expand)
        //
        // Return: file, with file.instances only including Clones that have been expanded as much as they can,
        //         and not any of the Clones used during that expansion.
        return file;
    }
    
    #consolidateClones(file) {
        // TODO
        // For each clone, accumulate it into an array if it is new
        // If it isn't new, update the existing clone to include this one too
        // using Clone::addTarget()
        //
        // Return: file, with file.instances containing unique Clone objects that may contain several targets
        return file;
    }

    // Public Processing Steps
    // --------------------
    preprocess(file) {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.java')) {
                reject(file.name + ' is not a java file. Discarding.');
            } else if (this.#myFileStore.isFileProcessed(file.name)) {
                reject(file.name + ' has already been processed.');
            } else {
                resolve(file);
            }
        });
    }

    transform(file) {
        file = this.#filterLines(file);
        file = this.#chunkify(file);
        return file;
    }

    matchDetect(file) {
        let allFiles = this.#myFileStore.getAllFiles();
        file.instances = file.instances || [];
        for (let f of allFiles) {
            // Process each file and detect clones
            file = this.#filterCloneCandidates(file, f); 
            file = this.#expandCloneCandidates(file);
            file = this.#consolidateClones(file); 
        }

        return file;
    }

    pruneFile(file) {
        delete file.lines;
        delete file.instances;
        return file;
    }
    
    storeFile(file) {
        this.#myFileStore.storeFile(this.pruneFile(file));
        return file;
    }

    get numberOfProcessedFiles() { return this.#myFileStore.numberOfFiles; }
}

export default CloneDetector; // Export the CloneDetector class using ES Module syntax

