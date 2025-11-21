class SourceLine {
    constructor(lineNumber, content) {
        this.lineNumber = lineNumber; // directly store the line number
        this.content = content;       // directly store the content
    }

    hasContent() {
        return this.content.length > 0; // checks if content has length
    }

    equals(otherLine) {
        return this.content === otherLine.content; // compares content of lines
    }
}

export default SourceLine;

