"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { createFhevmInstance, FhevmAbortError } from "@/fhevm/internal/fhevm";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: { provider: string | ethers.Eip1193Provider | undefined; chainId: number | undefined; enabled?: boolean; initialMockChains?: Readonly<Record<number, string>>; }) {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;
  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, setStatus] = useState<FhevmGoState>("idle");
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const providerRef = useRef<string | ethers.Eip1193Provider | undefined>(provider);
  const chainIdRef = useRef<number | undefined>(chainId);
  const mockRef = useRef<Record<number, string> | undefined>(initialMockChains);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    if (abortRef.current) { providerRef.current = undefined; chainIdRef.current = undefined; abortRef.current.abort(); abortRef.current = null; }
    providerRef.current = provider; chainIdRef.current = chainId;
    setInstance(undefined); setError(undefined); setStatus("idle");
    if (provider !== undefined) setTick((t) => t + 1);
  }, [provider, chainId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    if (!providerRef.current || !chainIdRef.current) return;
    const thisAbort = new AbortController();
    abortRef.current = thisAbort;
    setStatus("loading");
    createFhevmInstance({ signal: thisAbort.signal, provider: providerRef.current!, mockChains: mockRef.current, onStatusChange: (s) => console.log(`[useFhevm] ${s}`) })
      .then((i) => { if (thisAbort.signal.aborted) return; setInstance(i); setError(undefined); setStatus("ready"); })
      .catch((e) => { if (thisAbort.signal.aborted) return; setInstance(undefined); setError(e); setStatus("error"); });
    return () => { if (!thisAbort.signal.aborted) thisAbort.abort(); };
  }, [enabled, tick]);

  return { instance, refresh, error, status } as const;
}


