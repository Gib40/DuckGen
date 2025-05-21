#!/bin/bash

echo "[START] Emptying output/media and output/metadata at $(date)"

# Delete contents of the folders, but not the folders
find output/media -mindepth 1 -delete
find output/metadata -mindepth 1 -delete

echo "[DONE] Emptied both folders at $(date)"

# Kill this script's own background process (if running via nohup)
kill $$
