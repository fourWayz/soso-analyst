"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";

export default function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-terminal-border rounded text-xs text-terminal-text hover:text-terminal-bright hover:border-terminal-bright transition-colors"
          >
            <Wallet size={12} />
            {connected ? account.displayName : "Connect Wallet"}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
