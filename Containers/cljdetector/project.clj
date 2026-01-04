(defproject cljdetector "0.1.0-SNAPSHOT"
  :description "Clone Detector with MongoDB allowDiskUse support"
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [org.clj-commons/digest "1.4.100"]
                 [com.novemberain/monger "3.7.0-SNAPSHOT"]
                 [org.slf4j/slf4j-nop "1.7.12"]]
  :repositories [["snapshots" "https://oss.sonatype.org/content/repositories/snapshots"]]
  :main ^:skip-aot cljdetector.core
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all
                       :jvm-opts ["-Dclojure.compiler.direct-linking=true"]}})
