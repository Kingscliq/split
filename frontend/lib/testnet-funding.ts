const FRIENDBOT_URL = "https://friendbot.stellar.org";
const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

function friendbotError(responseBody: string) {
  const normalized = responseBody.toLowerCase();
  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "Friendbot is receiving too many requests. Wait a moment, then try again.";
  }
  if (
    normalized.includes("already") ||
    normalized.includes("exist") ||
    normalized.includes("balance")
  ) {
    return "Friendbot could not add more XLM. This account may already be funded—refresh its Testnet balance.";
  }
  return "Friendbot could not fund this account. Confirm it is using Testnet, then try again.";
}

export async function isTestnetAccountFunded(address: string): Promise<boolean> {
  const response = await fetch(`${HORIZON_TESTNET_URL}/accounts/${encodeURIComponent(address)}`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Could not check this wallet on Stellar Testnet.");
  return true;
}

export async function fundTestnetAccount(address: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`);
  const responseBody = await response.text();
  if (!response.ok) throw new Error(friendbotError(responseBody));
}
