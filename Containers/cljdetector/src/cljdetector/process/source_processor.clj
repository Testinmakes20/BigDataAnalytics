(ns cljdetector.process.source-processor
  (:use [clojure.java.io])
  (:require [clojure.string :as string]
            [clj-commons.digest :as digest]))


(def emptyLine (re-pattern "^\\s*$"))
(def oneLineComment (re-pattern "//.*"))
(def oneLineMultiLineComment (re-pattern "/\\*.*?\\*/"))
(def openMultiLineComment (re-pattern "/\\*+[^*/]*$"))
(def closeMultiLineComment (re-pattern "^[^*/]*\\*+/"))

(defn process-lines [lines]
  (drop 1
        (reduce (fn [collection item]
                  (conj collection
                        (let [index (+ 1 (:lineNumber (last collection)))]
                          (cond
                            (and (= (:lineType (last collection)) "multiLineComment") 
                                 (re-matches closeMultiLineComment item)) {:lineNumber index :contents (string/trim (string/replace item closeMultiLineComment "")) :lineType "lastMultiLineComment"}
                            (= (:lineType (last collection)) "multiLineComment") {:lineNumber index :contents "" :lineType "multiLineComment"}
                            (re-matches emptyLine item) {:lineNumber index :contents "" :lineType "emptyLine"}
                            (re-matches oneLineComment item) {:lineNumber index :contents (string/trim (string/replace item oneLineComment "")) :lineType "oneLineComment"}
                            (re-matches oneLineMultiLineComment item) {:lineNumber index :contents (string/trim (string/replace item oneLineMultiLineComment "")) :lineType "oneLineMultiLineComment"}
                            (re-matches openMultiLineComment item) {:lineNumber index :contents (string/trim (string/replace item openMultiLineComment "")) :lineType "multiLineComment"}
                            :else {:lineNumber index :contents (string/trim item) :lineType "normal"}
                            )))) [{:lineNumber 0 :contents "" :lineType "startLine"}] lines)))


(defn normalize-line [line]
  "Trim whitespace and remove inline comments."
  (-> line
      string/trim
      (string/replace #"//.*" "")       ; remove single-line comments
      (string/replace #"/\*.*?\*/" ""))) ; remove inline block comments
(defn chunkify-file [chunkSize file]
  (try
    (let [fileName (.getPath file)]
      (println "Processing file:" fileName)
      ;; Read lines and normalize
      (let [filteredLines (->> file
                               slurp
                               string/split-lines        ;; safer than split with regex
                               (map normalize-line)
                               (remove empty?)
                               process-lines)
            total-lines (count filteredLines)
            iterator (range (- total-lines chunkSize 0))]
        (map (fn [i]
               (let [chunk (take chunkSize (nthrest filteredLines i))
                     startLine (:lineNumber (first chunk))
                     endLine (:lineNumber (last chunk))
                     ;; Join contents after normalization to compute hash
                     chunk-text (->> chunk
                                     (map :contents)
                                     (map string/trim)
                                     (remove empty?)
                                     (string/join "\n"))
                     hash (digest/md5 chunk-text)]
                 ;; Debug log for each chunk
                 ;; (println "Chunk hash:" hash "File:" fileName "Lines:" startLine "-" endLine)
                 {:fileName fileName
                  :startLine startLine
                  :endLine endLine
                  :chunkHash hash}))
             iterator)))
    (catch Exception e
      (println "Error processing file:" file "Exception:" e)
      [])))



(defn chunkify [chunkSize files]
  (map #(chunkify-file chunkSize %) files))

(defn traverse-directory [path pattern]
  (->> (file-seq (file path))
       (filter #(.isFile %))                 
       (filter #(re-matches pattern (.getName %)))))
