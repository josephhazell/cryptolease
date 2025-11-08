"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Eip1193Provider = any;

interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error?: Error;
  connect: () => Promise<void>;
}

function detectProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const anyWindow = window as any;
  if (anyWindow?.ethereum) return anyWindow.ethereum;
  return undefined;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const [provider, setProvider] = useState<Eip1193Provider | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [accounts, setAccounts] = useState<string[] | undefined>();
  const [error, setError] = useState<Error | undefined>();

  const isConnected = useMemo(() => Boolean(provider && accounts && accounts.length > 0), [provider, accounts]);

  useEffect(() => {
    const p = detectProvider();
    setProvider(p);
  }, []);

  useEffect(() => {
    if (!provider) return;
    provider.request({ method: "eth_chainId" }).then((id: string) => setChainId(parseInt(id, 16))).catch(() => {});
    provider.request({ method: "eth_accounts" }).then((accs: string[]) => setAccounts(accs)).catch(() => {});

    const onChainChanged = (id: string) => setChainId(parseInt(id, 16));
    const onAccountsChanged = (accs: string[]) => setAccounts(accs);
    provider.on?.("chainChanged", onChainChanged);
    provider.on?.("accountsChanged", onAccountsChanged);
    return () => {
      provider.removeListener?.("chainChanged", onChainChanged);
      provider.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [provider]);

  const connect = useCallback(async () => {
    setError(undefined);
    try {
      if (!provider) throw new Error("MetaMask provider not found");
      const accs: string[] = await provider.request({ method: "eth_requestAccounts" });
      setAccounts(accs);
      const id: string = await provider.request({ method: "eth_chainId" });
      setChainId(parseInt(id, 16));
    } catch (e) {
      setError(e as Error);
    }
  }, [provider]);

  return { provider, chainId, accounts, isConnected, error, connect };
}

interface MetaMaskProviderProps { children: ReactNode }

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  const state = useMetaMaskInternal();
  return <MetaMaskContext.Provider value={state}>{children}</MetaMaskContext.Provider>;
};

export function useMetaMask() {
  const ctx = useContext(MetaMaskContext);
  if (!ctx) throw new Error("useMetaMask must be used within MetaMaskProvider");
  return ctx;
}


