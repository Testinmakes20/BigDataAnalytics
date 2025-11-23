class Clone {

    constructor(sourceName, targetName, sourceChunk, targetChunk) {
        this.sourceName = sourceName;
        this.sourceStart = sourceChunk[0].lineNumber;
        this.sourceEnd = sourceChunk[sourceChunk.length - 1].lineNumber;
        this.sourceChunk = sourceChunk;

        // Keep all targets in an array
        this.targets = [{
            name: targetName,
            startLine: targetChunk[0].lineNumber,
            endLine: targetChunk[targetChunk.length - 1].lineNumber,
            chunk: targetChunk
        }];
    }

    equals(clone) {
        return this.sourceName === clone.sourceName &&
               this.sourceStart === clone.sourceStart &&
               this.sourceEnd === clone.sourceEnd;
    }

    addTarget(clone) {
        this.targets = this.targets.concat(clone.targets);
    }

    isNext(clone) {
        return (this.sourceChunk[this.sourceChunk.length - 1].lineNumber ===
                clone.sourceChunk[0].lineNumber - 1);
    }

    maybeExpandWith(clone) {
        if (this.isNext(clone)) {
            // Merge source chunks
            this.sourceChunk = [...this.sourceChunk, ...clone.sourceChunk];
            this.sourceEnd = this.sourceChunk[this.sourceChunk.length - 1].lineNumber;

            // Merge targets
            this.addTarget(clone);

            return true;
        }
        return false;
    }

    // NEW: check if two clones are the same (used in consolidation)
    isSameClone(clone) {
        return this.sourceName === clone.sourceName &&
               this.sourceStart === clone.sourceStart &&
               this.sourceEnd === clone.sourceEnd;
    }
}

export default Clone;


