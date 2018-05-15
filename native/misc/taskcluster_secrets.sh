#!/bin/bash -ex

set +x
secrets_url="http://taskcluster/secrets/v1/secret/project/testpilot/notes"
SECRET=$(curl "${secrets_url}")
echo "${SECRET}"

set -x
