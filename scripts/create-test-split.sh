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
SPLIT_CREATOR_ADDRESS="${SPLIT_CREATOR_ADDRESS:-}"
SPLIT_CREATOR_SIGNER="${SPLIT_CREATOR_SIGNER:-${STELLAR_SOURCE_ACCOUNT}}"
SPLIT_TOKEN_ADDRESS="${SPLIT_TOKEN_ADDRESS:-${SPLIT_CREATOR_ADDRESS}}"
SPLIT_TITLE="${SPLIT_TITLE:-Internet bill}"
SPLIT_REQUESTED_AMOUNT="${SPLIT_REQUESTED_AMOUNT:-100}"
SPLIT_TOTAL_AMOUNT="${SPLIT_TOTAL_AMOUNT:-100}"
SPLIT_PARTICIPANT_1_ADDRESS="${SPLIT_PARTICIPANT_1_ADDRESS:-}"
SPLIT_PARTICIPANT_1_NAME="${SPLIT_PARTICIPANT_1_NAME:-Ada}"
SPLIT_PARTICIPANT_2_ADDRESS="${SPLIT_PARTICIPANT_2_ADDRESS:-}"
SPLIT_PARTICIPANT_2_NAME="${SPLIT_PARTICIPANT_2_NAME:-Tolu}"

if [[ -z "${SPLIT_CONTRACT_ID}" ]]; then
  echo "SPLIT_CONTRACT_ID is empty in ${ENV_FILE}."
  echo "Deploy first with: ./scripts/deploy-and-smoke-test.sh"
  exit 1
fi

if [[ -z "${SPLIT_CREATOR_ADDRESS}" || -z "${SPLIT_TOKEN_ADDRESS}" ]]; then
  echo "SPLIT_CREATOR_ADDRESS and SPLIT_TOKEN_ADDRESS must be set in ${ENV_FILE}."
  exit 1
fi

if [[ -z "${SPLIT_PARTICIPANT_1_ADDRESS}" || -z "${SPLIT_PARTICIPANT_2_ADDRESS}" ]]; then
  echo "SPLIT_PARTICIPANT_1_ADDRESS and SPLIT_PARTICIPANT_2_ADDRESS must be set in ${ENV_FILE}."
  exit 1
fi

PARTICIPANTS_JSON="$(
  printf '[{"address":"%s","display_name":"%s"},{"address":"%s","display_name":"%s"}]' \
    "${SPLIT_PARTICIPANT_1_ADDRESS}" \
    "${SPLIT_PARTICIPANT_1_NAME}" \
    "${SPLIT_PARTICIPANT_2_ADDRESS}" \
    "${SPLIT_PARTICIPANT_2_NAME}"
)"

TITLE_JSON="$(printf '"%s"' "${SPLIT_TITLE}")"

echo "Creating test Split..."
echo "Contract: ${SPLIT_CONTRACT_ID}"
echo "Creator:  ${SPLIT_CREATOR_ADDRESS}"
echo "Signer:   ${SPLIT_CREATOR_SIGNER}"
echo "Token:    ${SPLIT_TOKEN_ADDRESS}"
echo "Title:    ${SPLIT_TITLE}"
echo "Amount:   requested=${SPLIT_REQUESTED_AMOUNT}, total=${SPLIT_TOTAL_AMOUNT}"
echo "Members:  ${SPLIT_PARTICIPANT_1_NAME}, ${SPLIT_PARTICIPANT_2_NAME}"
echo

SPLIT_ID="$(
  stellar contract invoke \
    --id "${SPLIT_CONTRACT_ID}" \
    --source "${SPLIT_CREATOR_SIGNER}" \
    --network "${STELLAR_NETWORK}" \
    -- create_split \
    --creator "${SPLIT_CREATOR_ADDRESS}" \
    --token "${SPLIT_TOKEN_ADDRESS}" \
    --requested_amount "${SPLIT_REQUESTED_AMOUNT}" \
    --total_amount "${SPLIT_TOTAL_AMOUNT}" \
    --title "${TITLE_JSON}" \
    --participants "${PARTICIPANTS_JSON}" \
    | tail -n 1
)"

echo
echo "Created Split ID: ${SPLIT_ID}"
echo
echo "Fetching created Split..."
stellar contract invoke \
  --id "${SPLIT_CONTRACT_ID}" \
  --source "${STELLAR_SOURCE_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  -- get_split \
  --split_id "${SPLIT_ID}"

echo
echo "Fetching first participant..."
stellar contract invoke \
  --id "${SPLIT_CONTRACT_ID}" \
  --source "${STELLAR_SOURCE_ACCOUNT}" \
  --network "${STELLAR_NETWORK}" \
  -- get_participant \
  --split_id "${SPLIT_ID}" \
  --participant "${SPLIT_PARTICIPANT_1_ADDRESS}"
