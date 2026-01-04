FROM clojure
WORKDIR /usr/src/app/

# Copy project.clj first to leverage Docker cache for deps
COPY project.clj /usr/src/app

# Install dependencies
RUN apt-get update && apt-get install -y netcat-openbsd \
    && lein deps

# Copy the rest of your source code
COPY . /usr/src/app

# Use ENTRYPOINT that respects JVM_OPTS
ENTRYPOINT ["sh", "-c", "lein run $JVM_OPTS"]

