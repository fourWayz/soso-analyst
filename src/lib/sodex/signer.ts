// SoDEX EIP-712 signing — matches the actual SoDEX spec exactly
// Ref: https://sodex.com/documentation/api/api
//
// Flow:
//  1. Build the action payload: { type, params }
//  2. payloadHash = keccak256(JSON.stringify(payload))  [compact, no spaces]
//  3. Sign EIP-712 ExchangeAction { payloadHash, nonce }
//  4. Prepend 0x01 to the raw signature bytes → typed signature
//  5. Send: X-API-Key = signer address, X-API-Sign = typed sig, X-API-Nonce = nonce

import { keccak256, toBytes } from "viem";
import type { WalletClient } from "viem";

// Testnet chainId = 138565, mainnet = 286623
const IS_TESTNET = (process.env.SODEX_BASE_URL ?? "").includes("testnet");
const CHAIN_ID   = IS_TESTNET ? 138565 : 286623;

// EIP-712 domain — exactly as documented
const SODEX_DOMAIN = {
  name: "spot",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
};

// EIP-712 types — exactly as documented
const EXCHANGE_ACTION_TYPES = {
  EIP712Domain: [
    { name: "name",              type: "string"  },
    { name: "version",           type: "string"  },
    { name: "chainId",           type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce",       type: "uint64"  },
  ],
};

// ── Spot order types (field order must match Go struct for correct payloadHash) ──

export interface SpotOrderItem {
  clOrdID: string;      // ^[0-9a-zA-Z_-]{1,36}$
  modifier: number;     // 0 = normal, 1 = post-only
  side: number;         // 1 = buy, 2 = sell
  type: number;         // 1 = limit, 2 = market
  timeInForce: number;  // 1 = GTC, 2 = IOC, 3 = GTX
  price?: string;       // DecimalString — limit orders only
  quantity?: string;    // DecimalString
  funds?: string;       // DecimalString — market buy by quote amount only
}

export interface BatchNewOrderParams {
  accountID: number;    // 0 = primary account
  symbol: string;       // e.g. "vBTC_vUSDC"
  orders: SpotOrderItem[];
}

export interface SignedRequest {
  apiKey: string;       // X-API-Key: signer EVM address
  signature: string;    // X-API-Sign: 0x01 + raw sig bytes
  nonce: number;        // X-API-Nonce
  body: BatchNewOrderParams;
}

// ── payloadHash computation ────────────────────────────────────────────────────

function computePayloadHash(actionType: string, params: BatchNewOrderParams): string {
  // Rules from docs:
  // 1. Compact JSON (no whitespace)
  // 2. Key order must match Go struct field order
  // 3. DecimalString fields must be quoted strings
  // 4. omitempty fields must be absent when unset

  const ordersJson = params.orders.map(o => {
    // Build in Go struct field order: clOrdID, modifier, side, type, timeInForce, price, quantity, funds
    const entry: Record<string, unknown> = {
      clOrdID: o.clOrdID,
      modifier: o.modifier,
      side: o.side,
      type: o.type,
      timeInForce: o.timeInForce,
    };
    if (o.price     !== undefined) entry.price    = o.price;
    if (o.quantity  !== undefined) entry.quantity = o.quantity;
    if (o.funds     !== undefined) entry.funds    = o.funds;
    return entry;
  });

  const payload = {
    type: actionType,
    params: {
      accountID: params.accountID,
      symbol: params.symbol,
      orders: ordersJson,
    },
  };

  const compactJson = JSON.stringify(payload);
  return keccak256(toBytes(compactJson));
}

// ── Browser-side signing via MetaMask ─────────────────────────────────────────

export async function signBatchOrder(params: BatchNewOrderParams): Promise<SignedRequest> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected. Install MetaMask to execute trades.");
  }

  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  if (!accounts[0]) throw new Error("Wallet not connected");

  const nonce = Date.now();   // Unix milliseconds — within (T-2days, T+1day)

  const payloadHash = computePayloadHash("newOrder", params);

  const typedData = JSON.stringify({
    types: EXCHANGE_ACTION_TYPES,
    domain: SODEX_DOMAIN,
    primaryType: "ExchangeAction",
    message: {
      payloadHash,
      nonce,
    },
  });

  const rawSig = (await window.ethereum.request({
    method: "eth_signTypedData_v4",
    params: [accounts[0], typedData],
  })) as string;

  // Prepend 0x01 to the raw signature bytes (typed signature format)
  const typedSig = "0x01" + rawSig.slice(2);

  return {
    apiKey:    accounts[0],
    signature: typedSig,
    nonce,
    body:      params,
  };
}

// ── Wagmi / viem wallet client signing (RainbowKit) ──────────────────────────

export async function signBatchOrderWithWagmi(
  params: BatchNewOrderParams,
  walletClient: WalletClient
): Promise<SignedRequest> {
  const account = walletClient.account;
  if (!account) throw new Error("No account connected");

  const nonce = Date.now();
  const payloadHash = computePayloadHash("newOrder", params);

  const rawSig = await walletClient.signTypedData({
    account,
    domain: SODEX_DOMAIN,
    types: {
      ExchangeAction: [
        { name: "payloadHash", type: "bytes32" },
        { name: "nonce",       type: "uint64"  },
      ],
    },
    primaryType: "ExchangeAction",
    message: {
      payloadHash: payloadHash as `0x${string}`,
      nonce: BigInt(nonce),
    },
  });

  const typedSig = "0x01" + rawSig.slice(2);

  return {
    apiKey:    account.address,
    signature: typedSig,
    nonce,
    body:      params,
  };
}

// ── Build a spot market buy order ─────────────────────────────────────────────

export function buildMarketBuy(symbol: string, quantity: string, clOrdID?: string): BatchNewOrderParams {
  return {
    accountID: 0,
    symbol,
    orders: [{
      clOrdID:     clOrdID ?? `cm-${Date.now()}`,
      modifier:    0,
      side:        1,       // buy
      type:        2,       // market
      timeInForce: 2,       // IOC (required for market)
      quantity,
    }],
  };
}

export function buildLimitBuy(symbol: string, price: string, quantity: string, clOrdID?: string): BatchNewOrderParams {
  return {
    accountID: 0,
    symbol,
    orders: [{
      clOrdID:     clOrdID ?? `cm-${Date.now()}`,
      modifier:    0,
      side:        1,       // buy
      type:        1,       // limit
      timeInForce: 1,       // GTC
      price,
      quantity,
    }],
  };
}

// Declare global for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
