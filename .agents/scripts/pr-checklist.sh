#!/bin/bash
# =============================================================================
# PR Checklist — ai-defra-search-frontend
# =============================================================================
# Run this before raising a PR to catch issues early.
# Developers: edit this file to suit your needs.
# =============================================================================

set -e  # Stop on first failure

# Run from anywhere — this script resolves its own location
cd "$(dirname "$0")/../.."

# -----------------------------------------------------------------------------
# Tokens — set these before running
# -----------------------------------------------------------------------------
SONAR_TOKEN=""   # See setup instructions in the SonarQube section below

echo ""
echo "=============================="
echo " 1. Tests"
echo "=============================="
# Requires: Node.js >= 22 and npm dependencies installed (npm ci)
npm run test:run

echo ""
echo "=============================="
echo " 2. Lint"
echo "=============================="
# Requires: Node.js >= 22 and npm dependencies installed (npm ci)
npm run lint

echo ""
echo "=============================="
echo " 3. Trivy"
echo "=============================="
# Requires: trivy  (brew install trivy)
TRIVY_INCLUDE_DEV_DEPS=true trivy repository . \
  --severity CRITICAL,HIGH,MEDIUM,LOW \
  --exit-code 1 \
  --ignorefile .trivyignore

echo ""
echo "=============================="
echo " 4. SonarQube"
echo "=============================="
# Requires: sonar-scanner  (brew install sonar-scanner)
#
# First-time setup:
#   https://portal.cdp-int.defra.cloud/documentation/how-to/sonarcloud.md?q=with%20a%20GitHub%20Action%22%20SonarCloud#sign-up-with-github
#
# Once set up, add your token to SONAR_TOKEN at the top of this file.
if [ -z "$SONAR_TOKEN" ]; then
  echo "Skipping SonarQube — SONAR_TOKEN is not set."
  echo "Set it at the top of this file to enable this step."
else
  sonar-scanner -Dsonar.token="$SONAR_TOKEN"
fi

echo ""
echo "=============================="
echo " All checks passed!"
echo "=============================="