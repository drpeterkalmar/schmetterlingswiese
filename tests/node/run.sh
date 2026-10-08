#!/bin/bash
# Node-Tests (v2.9, ohne Browser): reine Logik und Shader-/Material-Aufbau. Aufruf: bash tests/node/run.sh
cd "$(dirname "$0")/../.." || exit 1
node --import ./tests/node/umgebung.mjs --test 'tests/node/test_*.mjs'
