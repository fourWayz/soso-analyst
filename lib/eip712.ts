// EIP-712 typed data signing for SoDEX spot orders

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

export interface SoDEXOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
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

// Legacy order-level EIP-712 domain kept for reference
const SODEX_DOMAIN = {
  name: 'SoDEX',
  version: '1',
  chainId: 1,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const ORDER_TYPES = [
  { name: 'trader',     type: 'address' },
  { name: 'symbol',     type: 'string'  },
  { name: 'side',       type: 'string'  },
  { name: 'price',      type: 'string'  },
  { name: 'quantity',   type: 'string'  },
  { name: 'nonce',      type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
];

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

export async function signSoDEXOrder(
  account: string,
  params: SoDEXOrderParams,
): Promise<SignedOrder> {
  if (!window.ethereum) throw new Error('MetaMask is not installed');

  const nonce = Date.now().toString();
  const expiration = Math.floor(Date.now() / 1000 + 3600).toString(); // 1 hour validity

  const message = {
    trader: account,
    symbol: params.symbol,
    side: params.side,
    price: params.price,
    quantity: params.quantity,
    nonce,
    expiration,
  };

  const typedData = JSON.stringify({
    domain: SODEX_DOMAIN,
    types: {
      EIP712Domain: [
        { name: 'name',              type: 'string'  },
        { name: 'version',           type: 'string'  },
        { name: 'chainId',           type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Order: ORDER_TYPES,
    },
    primaryType: 'Order',
    message,
  });

  const signature = (await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [account, typedData],
  })) as string;

  return {
    ...params,
    trader: account,
    nonce,
    expiration,
    signature,
  };
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
