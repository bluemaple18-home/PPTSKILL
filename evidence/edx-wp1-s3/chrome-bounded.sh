#!/bin/sh
exec '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --disable-background-networking --disable-component-update --disable-sync --disable-default-apps --disable-extensions --disable-features=OptimizationHints,MediaRouter,Translate --disable-gpu "$@"
