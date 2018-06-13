#!/bin/bash -ex

set +x

secrets_url="http://taskcluster/secrets/v1/secret/project/testpilot/notes"
SECRET=$(curl "${secrets_url}")

export KEYSTORE=$(echo "${SECRET}" | jq -r '.secret.KEYSTORE')
export KEYSTORE_URI=$(echo "${SECRET}" | jq -r '.secret.KEYSTORE_URI')
export MYAPP_RELEASE_KEY_ALIAS=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_KEY_ALIAS')
export MYAPP_RELEASE_KEY_PASSWORD=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_KEY_PASSWORD')
export MYAPP_RELEASE_STORE_FILE=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_STORE_FILE')
export MYAPP_RELEASE_STORE_PASSWORD=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_STORE_PASSWORD')
export SENTRY_DSN=$(echo "${SECRET}" | jq -r '.secret.SENTRY_DSN')

# use curl to download a keystore from $KEYSTORE_URI, if set,
# to the path/filename set in $KEYSTORE.
if [[ $KEYSTORE && ${KEYSTORE} && $KEYSTORE_URI && ${KEYSTORE_URI} ]]
then
    echo "Keystore detected - downloading..."
    curl -L -o android/app/${KEYSTORE} ${KEYSTORE_URI}
else
    echo "Keystore uri not set.  .APK artifact will not be signed."
fi

set -x
