import SourceLine from './SourceLine.js'; // Importing SourceLine
import FileStorage from './FileStorage.js'; // Importing FileStorage 
import Clone from './Clone.js'; 

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
    console.log(`Filtering clone candidates between ${file.name} and ${compareFile.name}...`);
    let newInstances = [];

    for (let i = 0; i < file.chunks.length; i++) {
        let chunkA = file.chunks[i];
        for (let j = 0; j < compareFile.chunks.length; j++) {
            let chunkB = compareFile.chunks[j];
            if (this.#chunkMatch(chunkA, chunkB)) {
                let clone = new Clone(file.name, compareFile.name, chunkA, chunkB);
                newInstances.push(clone);
                console.log(`✅ Found matching chunk: ${file.name}[${i}] <-> ${compareFile.name}[${j}]`);
            }
        }
    }

    file.instances = file.instances || [];
    file.instances = file.instances.concat(newInstances);

    console.log(`Total clone candidates after filtering: ${file.instances.length}`);
    return file;
}

#expandCloneCandidates(file) {
    console.log(`Expanding clone candidates for file ${file.name}...`);
    if (!file.instances || file.instances.length === 0) return file;

    let expandedClones = [];
    let used = new Set();

    for (let i = 0; i < file.instances.length; i++) {
        if (used.has(i)) continue;

        let clone = file.instances[i];

        for (let j = i + 1; j < file.instances.length; j++) {
            if (used.has(j)) continue;

            let otherClone = file.instances[j];
            if (clone.maybeExpandWith(otherClone)) {
                used.add(j);
                console.log(`🔄 Expanded clone between ${clone.sourceFile} and ${otherClone.targetFile}`);
            }
        }

        expandedClones.push(clone);
    }

    file.instances = expandedClones;
    console.log(`Total clones after expansion: ${file.instances.length}`);
    return file;
}

#consolidateClones(file) {
    console.log(`Consolidating clones for file ${file.name}...`);
    if (!file.instances || file.instances.length === 0) return file;

    let uniqueClones = [];

    for (let clone of file.instances) {
        let existing = uniqueClones.find(c => c.isSameClone(clone));
        if (existing) {
            existing.addTarget(clone);
            console.log(`➕ Merged clone: ${clone.sourceFile} -> ${clone.targetFile}`);
        } else {
            uniqueClones.push(clone);
            console.log(`🆕 New unique clone: ${clone.sourceFile} -> ${clone.targetFile}`);
        }
    }

    file.instances = uniqueClones;
    console.log(`Total unique clones after consolidation: ${file.instances.length}`);
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

// graph code
    getMetricsForFile(file) {
    const totalLines = file.contents.split("\n").length;

    const clones = file.instances || [];
    const cloneCount = clones.length;

    const avgCloneLength =
        cloneCount === 0
            ? 0
            : clones.reduce((sum, c) => sum + (c.sourceEnd - c.sourceStart + 1), 0) /
              cloneCount;

    // Count unique cloned lines
    const clonedLines = new Set();
    for (const c of clones) {
        for (let i = c.sourceStart; i <= c.sourceEnd; i++) {
            clonedLines.add(i);
        }
    }

    const clonePercentage =
        totalLines === 0 ? 0 : (clonedLines.size / totalLines) * 100;

    return {
        fileName: file.name,
        cloneCount,
        avgCloneLength,
        clonePercentage,
        totalLines,
    };
}

}

export default CloneDetector; // Export the CloneDetector

