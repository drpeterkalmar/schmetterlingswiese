#!/bin/bash
# v3.1: Live-Prüfung per curl – wartet, bis GitHub Pages Version (js/main.js) und Service-Worker-Build (sw.js) wie lokal ausliefert
cd "$(dirname "$0")/.." || exit 1
U=https://drpeterkalmar.github.io/schmetterlingswiese
V=$(grep -o "VERSION = '[^']*'" js/main.js | cut -d"'" -f2); B=$(grep -o "VERSION = '[^']*'" sw.js | cut -d"'" -f2)
for i in $(seq 1 40); do
  LV=$(curl -s "$U/js/main.js?x=$RANDOM" | grep -o "VERSION = '[^']*'" | cut -d"'" -f2)
  LB=$(curl -s "$U/sw.js?x=$RANDOM" | grep -o "VERSION = '[^']*'" | cut -d"'" -f2)
  if [ "$LV" = "$V" ] && [ "$LB" = "$B" ]; then echo "LIVE ok: Version $LV, Build $LB ($(date +%H:%M:%S))"; exit 0; fi
  sleep 10
done
echo "LIVE noch nicht: live $LV/$LB, lokal $V/$B"; exit 1
