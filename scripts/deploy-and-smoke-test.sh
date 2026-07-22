#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.deploy"
EXAMPLE_ENV_FILE="${ROOT_DIR}/.env.deploy.example"
WASM_PATH="${ROOT_DIR}/target/wasm32v1-none/release/split_contract.wasm"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${EXAMPLE_ENV_FILE}" "${ENV_FILE}"
  echo "Created ${ENV_FILE}. Edit it if you want a different source account/network."
fi

set -a
# shellcheck source=/dev/null
source "${ENV_FILE}"
set +a

STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
STELLAR_SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-deployer}"
SPLIT_CONTRACT_ID="${SPLIT_CONTRACT_ID:-}"

echo "Network: ${STELLAR_NETWORK}"
echo "Source account alias: ${STELLAR_SOURCE_ACCOUNT}"
echo

echo "Checking source account address..."
stellar keys address "${STELLAR_SOURCE_ACCOUNT}"
echo

echo "Funding source account on ${STELLAR_NETWORK} if needed..."
stellar keys fund "${STELLAR_SOURCE_ACCOUNT}" --network "${STELLAR_NETWORK}" || true
echo

echo "Running contract tests..."
cargo test -p split-contract
echo

echo "Building contract WASM..."
stellar contract build
echo

if [[ -z "${SPLIT_CONTRACT_ID}" ]]; then
  echo "No SPLIT_CONTRACT_ID found in ${ENV_FILE}; deploying a fresh contract..."
  SPLIT_CONTRACT_ID="$(
    stellar contract deploy \
      --wasm "${WASM_PATH}" \
      --source "${STELLAR_SOURCE_ACCOUNT}" \
      --network "${STELLAR_NETWORK}" \
      | tail -n 1
  )"

  if grep -q '^SPLIT_CONTRACT_ID=' "${ENV_FILE}"; then
    perl -0pi -e "s/^SPLIT_CONTRACT_ID=.*/SPLIT_CONTRACT_ID=${SPLIT_CONTRACT_ID}/m" "${ENV_FILE}"
  else
    printf '\nSPLIT_CONTRACT_ID=%s\n' "${SPLIT_CONTRACT_ID}" >> "${ENV_FILE}"
  fi

  echo "Deployed Split contract: ${SPLIT_CONTRACT_ID}"
  echo "Saved contract ID to ${ENV_FILE}"
else
  echo "Reusing existing Split contract: ${SPLIT_CONTRACT_ID}"
fi

echo
echo "Checking split count..."
stellar contract invoke \
  --id "${SPLIT_CONTRACT_ID}" \
  --source "${STELLAR_SOURCE_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  -- get_split_count

echo
echo "create_split CLI help:"
stellar contract invoke \
  --id "${SPLIT_CONTRACT_ID}" \
  --source "${STELLAR_SOURCE_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  -- create_split --help

echo
echo "Done."
echo "Contract ID: ${SPLIT_CONTRACT_ID}"
echo "Config file: ${ENV_FILE}"
echo
echo "Next time, you can invoke without manually sourcing env vars:"
echo "./scripts/invoke-contract.sh get_split_count"
echo "./scripts/invoke-contract.sh create_split --help"
