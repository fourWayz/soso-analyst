// EIP-712 typed data signing for SoDEX spot orders

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

// Matches BatchNewOrderItem from SoDEX REST API schema
export interface BatchOrderItem {
  symbolID: number;
  clOrdID: string;        // ^[0-9a-zA-Z_-]{1,36}$
  side: 1 | 2;            // 1=BUY 2=SELL
  type: 1 | 2;            // 1=LIMIT 2=MARKET
  timeInForce: 1 | 2 | 3 | 4; // 1=GTC 2=FOK 3=IOC 4=GTX
  price?: string;
  quantity?: string;
}

// Matches BatchNewOrderRequest from SoDEX REST API schema
export interface BatchOrderRequest {
  accountID: number;
  orders: BatchOrderItem[];
}

// SoDEX EIP-712 domain (used for X-API-Sign nonce auth, no verifyingContract needed)
const SODEX_AUTH_DOMAIN = {
  name: 'SoDEX',
  version: '1',
};

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask is not installed. Install MetaMask to trade on SoDEX.');
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts[0]) throw new Error('No account authorised');
  return accounts[0].toLowerCase();
}

export async function getConnectedAccount(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[];
    return accounts[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

// Signs the nonce with EIP-712 for the X-API-Sign auth header.
// Omitting X-API-Key causes SoDEX to verify against the master wallet.
export async function signAuthNonce(account: string, nonce: number): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not available');
  const typedData = JSON.stringify({
    domain: SODEX_AUTH_DOMAIN,
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      Auth: [{ name: 'nonce', type: 'uint256' }],
    },
    primaryType: 'Auth',
    message: { nonce },
  });
  return (await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [account, typedData],
  })) as string;
}

// Generates a valid clOrdID matching ^[0-9a-zA-Z_-]{1,36}$
export function generateClOrdID(): string {
  return `soso-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
