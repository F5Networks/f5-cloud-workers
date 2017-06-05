#!/bin/bash
mkdir -p dist
for d in */; do
    if [[ "$d" != "dist/" ]]; then
        pushd "$d"
        npm install --production
        npm run build
        popd
        cp "$d"/build/RPMS/noarch/*.rpm dist
    fi
done