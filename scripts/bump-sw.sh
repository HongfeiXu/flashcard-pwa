#!/bin/bash
# 自动更新 SW 版本号（基于当前时间戳）
# 用法：在 git commit 前执行，或加到 pre-commit hook
TS=$(date +%s)
sed -i "s/const CACHE_VERSION = '.*'/const CACHE_VERSION = 'v3-${TS}'/" sw.js
echo "SW version bumped to v3-${TS}"
