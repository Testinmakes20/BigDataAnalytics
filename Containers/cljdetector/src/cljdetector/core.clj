(ns cljdetector.core
  (:require [clojure.string :as string]
            [cljdetector.process.source-processor :as source-processor]
            [cljdetector.process.expander :as expander]
            [cljdetector.storage.storage :as storage]))

(def DEFAULT-CHUNKSIZE 5)
(def source-dir (or (System/getenv "SOURCEDIR") "/tmp"))
(def source-type #"(?i).*\.java$")

(defn ts-println [& args]
  (let [ts (.toString (java.time.LocalDateTime/now))
        msg (string/join " " (map str args))]
    (println ts msg)
    (storage/addUpdate! ts msg)))


(defn maybe-clear-db [args]
  (when (some #{"CLEAR"} (map string/upper-case args))
      (ts-println "Clearing database...")
      (storage/clear-db!)))

(defn maybe-read-files [args]
  (when-not (some #{"NOREAD"} (map string/upper-case args))
    (ts-println "Reading and Processing files...")

    ;; Clear old data to avoid duplicates
    (ts-println "Clearing old files/chunks from DB...")
    (storage/clear-db!)

    ;; Limit to first 1000 files
    (let [chunk-param (System/getenv "CHUNKSIZE")
          chunk-size (if chunk-param
                       (Integer/parseInt chunk-param)
                       DEFAULT-CHUNKSIZE)
          file-handles (vec
                         (take 1000
                               (source-processor/traverse-directory
                                 source-dir source-type)))]

      (ts-println "Found" (count file-handles) "Java files")

      ;; Store files
      (ts-println "Storing files in MongoDB...")
      (storage/store-files! file-handles)

      ;; Generate and store chunks
      (ts-println "Generating chunks...")
      (let [chunks (source-processor/chunkify chunk-size file-handles)]
        (ts-println "Storing" (count chunks) "chunks in MongoDB...")
        (storage/store-chunks! chunks))

      ;; Save monitor stats
      (storage/save-monitor-stats!)
      (ts-println "Finished processing 1000 files."))))

(defn maybe-detect-clones [args]
  (when-not (some #{"NOCLONEID"} (map string/upper-case args))
    (ts-println "Identifying Clone Candidates...")
    (storage/identify-candidates!)   ;; ✅ This is where candidates are generated
    (ts-println "Found" (storage/count-items "candidates") "candidates")
    ;; Save monitor stats after identifying candidates
    (storage/save-monitor-stats!)
    (ts-println "Expanding Candidates...")
    (expander/expand-clones)
    ;; Save monitor stats after storing clones
    (storage/save-monitor-stats!)))


(defn pretty-print [clones]
  (doseq [clone clones]
    (println "====================\n" "Clone with" (count (:instances clone)) "instances:")
    (doseq [inst (:instances clone)]
      (println "  -" (:fileName inst) "startLine:" (:startLine inst) "endLine:" (:endLine inst)))
    (println "\nContents:\n----------\n" (:contents clone) "\n----------")))

(defn maybe-list-clones [args]
  (when (some #{"LIST"} (map string/upper-case args))
    (ts-println "Consolidating and listing clones...")
    (pretty-print (storage/consolidate-clones-and-source))))



(defn -main
  "Starting Point for All-At-Once Clone Detection
  Arguments:
   - Clear clears the database
   - NoRead do not read the files again
   - NoCloneID do not detect clones
   - List print a list of all clones"
  [& args]

  (maybe-clear-db args)
  (maybe-read-files args)
  (maybe-detect-clones args)
  (maybe-list-clones args)
  (ts-println "Summary")
  (storage/print-statistics))
