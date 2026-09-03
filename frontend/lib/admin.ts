export const ADMIN_WALLET_ADDRESS = "GCPCLTVEBHTC76WEGHICVEP6NVSRI6HD37T6CGL34HWFCXAP2H7HY7NK";

export function isAdminWallet(address: string | null | undefined): boolean {
  return address?.trim().toUpperCase() === ADMIN_WALLET_ADDRESS;
}
