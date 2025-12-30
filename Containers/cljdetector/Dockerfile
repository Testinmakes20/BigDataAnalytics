FROM clojure:latest

WORKDIR /usr/src/app/

# Copy project.clj first to install dependencies
COPY project.clj /usr/src/app/
RUN lein deps

# Copy all source files including the wait-for-mongo script
COPY . /usr/src/app

# Use the wait-for-mongo script as the entrypoint
ENTRYPOINT ["./wait-for-mongo.sh"]
