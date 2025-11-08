"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ethers } from "ethers";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";

interface UseMetaMaskEthersSignerState {
  sameChain: React.MutableRefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.MutableRefObject<(signer: ethers.JsonRpcSigner | undefined) => boolean>;
  provider: any;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  connect: () => Promise<void>;
  ethersBrowserProvider?: ethers.BrowserProvider;
  ethersReadonlyProvider?: ethers.ContractRunner;
  ethersSigner?: ethers.JsonRpcSigner;
  error?: Error;
  initialMockChains?: Readonly<Record<number, string>>;
}

function useMetaMaskEthersSignerInternal(parameters: { initialMockChains?: Readonly<Record<number, string>> }): UseMetaMaskEthersSignerState {
  const { initialMockChains } = parameters;
  const { provider, chainId, accounts, isConnected, connect, error } = useMetaMask();

  const [ethersBrowserProvider, setEthersBrowserProvider] = useState<ethers.BrowserProvider | undefined>();
  const [ethersReadonlyProvider, setEthersReadonlyProvider] = useState<ethers.ContractRunner | undefined>();
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>();

  const chainIdRef = useRef<number | undefined>(chainId);
  const ethersSignerRef = useRef<ethers.JsonRpcSigner | undefined>(undefined);

  const sameChain = useRef<(c: number | undefined) => boolean>((c) => c === chainIdRef.current);
  const sameSigner = useRef<(s: ethers.JsonRpcSigner | undefined) => boolean>((s) => s?.address === ethersSignerRef.current?.address);

  useEffect(() => { chainIdRef.current = chainId; }, [chainId]);

  useEffect(() => {
    if (!provider || !chainId || !isConnected || !accounts || accounts.length === 0) {
      ethersSignerRef.current = undefined;
      setEthersSigner(undefined);
      setEthersBrowserProvider(undefined);
      setEthersReadonlyProvider(undefined);
      return;
    }
    const bp = new ethers.BrowserProvider(provider);
    let rop: ethers.ContractRunner = bp;
    const rpcUrl = initialMockChains?.[chainId];
    if (rpcUrl) {
      rop = new ethers.JsonRpcProvider(rpcUrl);
    }
    const signer = new ethers.JsonRpcSigner(bp, accounts[0]);
    ethersSignerRef.current = signer;
    setEthersSigner(signer);
    setEthersBrowserProvider(bp);
    setEthersReadonlyProvider(rop);
  }, [provider, chainId, isConnected, accounts, initialMockChains]);

  return { sameChain, sameSigner, provider, chainId, accounts, isConnected, connect, ethersBrowserProvider, ethersReadonlyProvider, ethersSigner, error, initialMockChains };
}

interface MetaMaskEthersSignerProviderProps { children: ReactNode; initialMockChains: Readonly<Record<number, string>>; }

const MetaMaskEthersSignerContext = createContext<UseMetaMaskEthersSignerState | undefined>(undefined);

export const MetaMaskEthersSignerProvider: React.FC<MetaMaskEthersSignerProviderProps> = ({ children, initialMockChains }) => {
  const value = useMetaMaskEthersSignerInternal({ initialMockChains });
  return <MetaMaskEthersSignerContext.Provider value={value}>{children}</MetaMaskEthersSignerContext.Provider>;
};

export function useMetaMaskEthersSigner() {
  const ctx = useContext(MetaMaskEthersSignerContext);
  if (!ctx) throw new Error("useMetaMaskEthersSigner must be used within MetaMaskEthersSignerProvider");
  return ctx;
}


