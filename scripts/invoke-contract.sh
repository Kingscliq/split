#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.deploy"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}."
  echo "Create it with: cp .env.deploy.example .env.deploy"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "${ENV_FILE}"
set +a

STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
STELLAR_SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-deployer}"
SPLIT_CONTRACT_ID="${SPLIT_CONTRACT_ID:-}"

if [[ -z "${SPLIT_CONTRACT_ID}" ]]; then
  echo "SPLIT_CONTRACT_ID is empty in ${ENV_FILE}."
  echo "Deploy first with: ./scripts/deploy-and-smoke-test.sh"
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  echo "Usage:"
  echo "  ./scripts/invoke-contract.sh get_split_count"
  echo "  ./scripts/invoke-contract.sh get_split --split_id 1"
  echo "  ./scripts/invoke-contract.sh get_participant --split_id 1 --participant <ADDRESS_OR_KEY_ALIAS>"
  echo "  ./scripts/invoke-contract.sh create_split --help"
  exit 1
fi

stellar contract invoke \
  --id "${SPLIT_CONTRACT_ID}" \
  --source "${STELLAR_SOURCE_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  -- "$@"
