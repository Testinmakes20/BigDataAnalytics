FROM clojure
WORKDIR /usr/src/app/
COPY project.clj /usr/src/app

RUN apt-get update && apt-get install -y netcat \
    && lein deps

COPY . /usr/src/app

ENTRYPOINT ["lein", "run"]
