FROM alpine

# Install dependencies
RUN apk add --no-cache bash perl coreutils curl

# Create folders for scripts and test files
RUN mkdir -p /Scripts /test /QualitasCorpus
VOLUME /QualitasCorpus

# Set working directory
WORKDIR /root

# Copy generator script and make executable
COPY generate-code-stream.sh /root/generate-code-stream.sh
RUN chmod +x /root/generate-code-stream.sh

# Copy test files
COPY test /app/test

# Set the script as the entrypoint
ENTRYPOINT ["/root/generate-code-stream.sh"]

