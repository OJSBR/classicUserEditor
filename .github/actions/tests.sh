#!/bin/bash

set -e

npx cypress run  --headless --browser chrome  --config '{"specPattern":["plugins/generic/classicUserEditor/cypress/tests/functional/*.cy.js"]}'
