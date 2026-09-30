#!/usr/bin/env bash
set -euo pipefail

git checkout master
git pull origin master
git merge development
git push origin master
git checkout development
git push origin development