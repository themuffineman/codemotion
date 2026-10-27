#!/bin/bash
# Runs every command shown in the video and saves its real output to
# public/code/dijkstra/terminal/<step>.txt, plus a copy of the source files.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/../../public/code/dijkstra"
mkdir -p "$OUT/terminal"
rm -f "$OUT"/terminal/*.txt
cp "$HERE"/graph.ts "$HERE"/dijkstra.ts "$HERE"/run.ts "$HERE"/heap.ts "$HERE"/dijkstra-heap.ts "$HERE"/bench.ts "$OUT"
cd "$HERE"

# run <step> <command...>: prints "$ command" and its output into <step>.txt
run() { local step=$1; shift; { echo "\$ $*"; eval "$*"; echo; } >> "$OUT/terminal/$step.txt" 2>&1; }

run 01-run "node run.ts"
run 02-bench "node bench.ts"
