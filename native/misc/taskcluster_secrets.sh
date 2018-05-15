#!/bin/bash -ex

set +x

secrets_url="http://taskcluster/secrets/v1/secret/project/testpilot/notes"
SECRET=$(curl "${secrets_url}")

KEYSTORE=$(echo "${SECRET}" | jq -r '.secret.KEYSTORE')
KEYSTORE_URI=$(echo "${SECRET}" | jq -r '.secret.KEYSTORE_URI')
MYAPP_RELEASE_KEY_ALIAS=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_KEY_ALIAS')
MYAPP_RELEASE_KEY_PASSWORD=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_KEY_PASSWORD')
MYAPP_RELEASE_STORE_FILE=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_STORE_FILE')
MYAPP_RELEASE_STORE_PASSWORD=$(echo "${SECRET}" | jq -r '.secret.MYAPP_RELEASE_STORE_PASSWORD')
SENTRY_DSN=$(echo "${SECRET}" | jq -r '.secret.SENTRY_DSN')

sh ./misc/download_keystore.sh

set -x
