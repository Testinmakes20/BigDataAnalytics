const emptyLine = /^\s*$/;
const oneLineComment = /\/\/.*/;
const oneLineMultiLineComment = /\/\*.*?\*\//; 
const openMultiLineComment = /\/\*+[^\*\/]*$/;
const closeMultiLineComment = /^[\*\/]*\*+\//;

const SourceLine = require('./SourceLine');
const FileStorage = require('./FileStorage');
const Clone = require('./Clone');

const DEFAULT_CHUNKSIZE=5;

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
        file.lines=[];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if ( inMultiLineComment ) {
                if ( -1 != line.search(closeMultiLineComment) ) {
                    line = line.replace(closeMultiLineComment, '');
                    inMultiLineComment = false;
                } else {
                    line = '';
                }
            }

            line = line.replace(emptyLine, '');
            line = line.replace(oneLineComment, '');
            line = line.replace(oneLineMultiLineComment, '');
            
            if ( -1 != line.search(openMultiLineComment) ) {
                line = line.replace(openMultiLineComment, '');
                inMultiLineComment = true;
            }

            file.lines.push( new SourceLine(i+1, line.trim()) );
        }
       
        return file;
    }

    #getContentLines(file) {
        return file.lines.filter( line => line.hasContent() );        
    }


    #chunkify(file) {
        let chunkSize = this.#myChunkSize;
        let lines = this.#getContentLines(file);
        file.chunks=[];

        for (let i = 0; i <= lines.length-chunkSize; i++) {
            let chunk = lines.slice(i, i+chunkSize);
            file.chunks.push(chunk);
        }
        return file;
    }
    
    #chunkMatch(first, second) {
        let match = true;

        if (first.length != second.length) { match = false; }
        for (let idx=0; idx < first.length; idx++) {
            if (!first[idx].equals(second[idx])) { match = false; }
        }

        return match;
    }
    
    #filterCloneCandidates(file, compareFile) {
    let newInstances = [];

    // For each chunk in the current file
    for (let i = 0; i < file.chunks.length; i++) {
        let fileChunk = file.chunks[i];

        // Compare the current chunk with all chunks in compareFile
        for (let j = 0; j < compareFile.chunks.length; j++) {
            let compareChunk = compareFile.chunks[j];

            if (this.#chunkMatch(fileChunk, compareChunk)) {
                // Create a new Clone object for the matching chunks
                let newClone = new Clone(file.name, fileChunk, compareFile.name, compareChunk);
                newInstances.push(newClone);
            }
        }
    }

    // Merge new instances with the existing ones in the file
    file.instances = (file.instances || []).concat(newInstances);

    return file;
}

        // TODO
        // For each chunk in file.chunks, find all #chunkMatch() in compareFile.chunks
        // For each matching chunk, create a new Clone.
        // Store the resulting (flat) array in file.instances.
        // 
        // TIP 1: Array.filter to find a set of matches, Array.map to return a new array with modified objects.
        // TIP 2: You can daisy-chain calls to filter().map().filter().flat() etc.
        // TIP 3: Remember that file.instances may have already been created, so only append to it.
        //
        // Return: file, including file.instances which is an array of Clone objects (or an empty array).
        //

     
  #expandCloneCandidates(file) {
    //store expanded clones
    let expandedInstances = [];

    for (let i = 0; i < file.instances.length; i++) {
        let currentClone = file.instances[i];

        // Try to expand the current clone with any of the previously expanded clones
        let expanded = false;
        
        for (let j = 0; j < expandedInstances.length; j++) {
            let expandedClone = expandedInstances[j];

            // Check if the current clone can be expanded with the expanded clone
            if (currentClone.maybeExpandWith(expandedClone)) {
                expanded = true;
                break;
            }
        }

        // If not expanded
        if (!expanded) {
            expandedInstances.push(currentClone);
        }
    }

    file.instances = expandedInstances;

    return file;
}

   #consolidateClones(file) {
    // Start with an empty array to add unique clones
    let uniqueClones = [];

    // Go through each clone in the file.instances array
    file.instances = file.instances.reduce((accumulator, currentClone) => {
        // Try to find an existing clone in the accumulator that matches the current clone
        let existingClone = accumulator.find(clone => clone.equals(currentClone));

        if (existingClone) {
            // If identical clone exists, update it to include the current one
            existingClone.addTarget(currentClone);
        } else {
            // If no match found, add the current clone as a new unique clone
            accumulator.push(currentClone);
        }

        return accumulator;
    }, []);  // Initial empty array for reduce

    // Assign the consolidated list of clones back to file.instances
    return file;
}
 
   

    // Public Processing Steps
    // --------------------
    preprocess(file) {
        return new Promise( (resolve, reject) => {
            if (!file.name.endsWith('.java') ) {
                reject(file.name + ' is not a java file. Discarding.');
            } else if(this.#myFileStore.isFileProcessed(file.name)) {
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
            // TODO implement these methods (or re-write the function matchDetect() to your own liking)
            // 
            // Overall process:
            // 
            // 1. Find all equal chunks in file and f. Represent each matching pair as a Clone.
            //
            // 2. For each Clone with endLine=x, merge it with Clone with endLine-1=x
            //    remove the now redundant clone, rinse & repeat.
            //    note that you may end up with several "root" Clones for each processed file f
            //    if there are more than one clone between the file f and the current
            //
            // 3. If the same clone is found in several places, consolidate them into one Clone.
            //
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

module.exports = CloneDetector;
