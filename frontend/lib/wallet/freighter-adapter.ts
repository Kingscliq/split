import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "@/lib/split-contract";
import { accountType, type WalletConnection, type WalletSigner } from "@/lib/wallet/types";

export type FreighterIssue = {
  code: "missing" | "wrong_network" | "access" | "unknown";
  message: string;
};

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

function wrongNetworkIssue(network?: string): FreighterIssue {
  return {
    code: "wrong_network",
    message: `Freighter is on ${network || "another network"}. Open Freighter, click the hamburger menu (or globe/network icon), open Networks, and select Testnet. Then return to Split—it will reconnect automatically.`,
  };
}

export const freighterSigner: WalletSigner = {
  async signTransaction(transactionXdr, options) {
    const signed = await signTransaction(transactionXdr, {
      address: options.address,
      networkPassphrase: options.networkPassphrase,
    });
    if (signed.error) throw new Error(signed.error.message);
    return signed.signedTxXdr;
  },
};

export async function connectFreighter(): Promise<WalletConnection> {
  const installed = await isConnected();
  if (!installed.isConnected) {
    throw {
      code: "missing",
      message: "Freighter is not installed. Install it to connect your Stellar Testnet wallet.",
    } satisfies FreighterIssue;
  }

  const access = await requestAccess();
  if (access.error) {
    throw {
      code: "access",
      message: access.error.message,
    } satisfies FreighterIssue;
  }

  const network = await getNetworkDetails();
  if (network.error) {
    throw {
      code: "unknown",
      message: network.error.message,
    } satisfies FreighterIssue;
  }
  if (network.networkPassphrase !== NETWORK_PASSPHRASE) {
    throw wrongNetworkIssue(network.network);
  }

  return {
    session: {
      provider: "freighter",
      address: access.address,
      accountType: accountType(access.address),
      loginMethod: "wallet",
    },
    signer: freighterSigner,
  };
}

export async function restoreFreighter(): Promise<WalletConnection | null> {
  const installed = await isConnected();
  if (!installed.isConnected) return null;
  const permission = await isAllowed();
  if (!permission.isAllowed) return null;

  const [current, network] = await Promise.all([getAddress(), getNetworkDetails()]);
  if (current.error || network.error || network.networkPassphrase !== NETWORK_PASSPHRASE) {
    return null;
  }

  return {
    session: {
      provider: "freighter",
      address: current.address,
      accountType: accountType(current.address),
      loginMethod: "wallet",
    },
    signer: freighterSigner,
  };
}

export function watchFreighter(
  onConnection: (connection: WalletConnection | null) => void,
  onIssue: (issue: FreighterIssue) => void,
) {
  const watcher = new WatchWalletChanges(1200);
  watcher.watch((wallet) => {
    if (wallet.error) return;
    if (wallet.address && wallet.networkPassphrase === NETWORK_PASSPHRASE) {
      onConnection({
        session: {
          provider: "freighter",
          address: wallet.address,
          accountType: accountType(wallet.address),
          loginMethod: "wallet",
        },
        signer: freighterSigner,
      });
      return;
    }

    onConnection(null);
    if (wallet.address && wallet.networkPassphrase) {
      onIssue(wrongNetworkIssue(wallet.network));
    }
  });
  return () => watcher.stop();
}

export function normalizeFreighterIssue(error: unknown): FreighterIssue {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    return error as FreighterIssue;
  }
  return {
    code: "unknown",
    message: error instanceof Error ? error.message : "Could not connect Freighter.",
  };
}
