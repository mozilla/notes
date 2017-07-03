#!/bin/bash
set -ex
npm install

if [[ -z $TESTPILOT_AMO_USER || -z $TESTPILOT_AMO_SECRET ]]; then
    # Could build the development package here if you want
    exit 1

else
    # for the locales
    npm run build
    # get rid of the unsigned xpi
    rm -f ./web-ext-artifacts/*.xpi

    ./node_modules/.bin/web-ext sign \
    --source-dir src \
    --api-key $TESTPILOT_AMO_USER \
    --api-secret $TESTPILOT_AMO_SECRET
    mv ./web-ext-artifacts/*.xpi ./signed-addon.xpi

fi
