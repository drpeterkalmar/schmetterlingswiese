#!/bin/bash
# Kern-Testsuite (lokaler Server muss laufen: python3 tools/serve.py — mehrfädig, Port 8471)
cd "$(dirname "$0")/.." || exit 1
set -o pipefail
for t in test_levels test_celebrate test_magnet_stuck test_glitter_bounds test_ui test_v22 test_v22_werkstatt test_pwa_input test_audio test_flight_audio test_anatomy test_leaks test_perf test_frametimes; do
  echo "=== $t"; python3 tests/$t.py 2>&1 | grep -v "GL Driver" | tail -12 || exit 1
done
