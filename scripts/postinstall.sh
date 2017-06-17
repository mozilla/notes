#!/usr/bin/env bash

set -e

cp node_modules/testpilot-metrics/testpilot-metrics.js src/vendor

cp node_modules/kinto-http/dist/kinto-http.min.js src/sidebar/vendor/kinto-http.js
cp node_modules/quill/dist/quill.min.js src/sidebar/vendor/quill.js
cp node_modules/quill/dist/quill.snow.css src/sidebar/vendor
cp node_modules/jose-jwe-jws/dist/jose.min.js src/sidebar/vendor/jose.js

# Copy the 3rd party LICENSE files.
cp node_modules/kinto-http/LICENSE src/sidebar/vendor/kinto-http.LICENSE
cp node_modules/quill/LICENSE src/sidebar/vendor/quill.LICENSE
cp node_modules/jose-jwe-jws/LICENSE src/sidebar/vendor/jose.LICENSE
