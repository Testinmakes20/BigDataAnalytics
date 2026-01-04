FROM clojure:latest
WORKDIR /usr/src/app/

# Copy project.clj first to cache deps
COPY project.clj /usr/src/app/

# Install required packages and fetch dependencies
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    lein deps

# Copy the rest of your source code
COPY . /usr/src/app

# Set JVM heap for large datasets
ENV JVM_OPTS="-Xms2g -Xmx4g"

# Run your app
ENTRYPOINT ["lein", "run"]
