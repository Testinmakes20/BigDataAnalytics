FROM alpine

# Install dependencies
RUN apk add --no-cache bash perl coreutils curl

# Create folders
RUN mkdir -p /root /QualitasCorpus /app/test
VOLUME /QualitasCorpus

# Set working directory
WORKDIR /root

# Copy the generator script and make executable
COPY generate-code-stream.sh /root/generate-code-stream.sh
RUN chmod +x /root/generate-code-stream.sh

# Don't COPY test files in Dockerfile — use a volume mount instead

# Set entrypoint
ENTRYPOINT ["/root/generate-code-stream.sh"]
