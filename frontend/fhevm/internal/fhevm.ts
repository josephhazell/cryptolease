import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import { RelayerSDKLoader, isFhevmWindowType, type FhevmWindowType } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import type { FhevmInstance, FhevmInstanceConfig } from "@/fhevm/fhevmTypes";

export class FhevmReactError extends Error { code: string; constructor(code: string, message?: string, options?: { cause?: unknown }) { super(message as any); this.code = code; this.name = "FhevmReactError"; } }

function throwFhevmError(code: string, message?: string, cause?: unknown): never { throw new FhevmReactError(code, message, cause ? { cause } : undefined); }

const isFhevmInitialized = (): boolean => { if (!isFhevmWindowType(window, console.log)) return false; return (window as any).relayerSDK.__initialized__ === true; };

const fhevmLoadSDK = () => { const loader = new RelayerSDKLoader({ trace: console.log }); return loader.load(); };

const fhevmInitSDK = async (options?: unknown) => { if (!isFhevmWindowType(window, console.log)) throw new Error("window.relayerSDK is not available"); const result = await (window as any).relayerSDK.initSDK(options); (window as any).relayerSDK.__initialized__ = result; if (!result) throw new Error("window.relayerSDK.initSDK failed."); return true; };

function checkIsAddress(a: unknown): a is `0x${string}` { return typeof a === "string" && isAddress(a); }

export class FhevmAbortError extends Error { constructor(message = "FHEVM operation was cancelled") { super(message); this.name = "FhevmAbortError"; } }

type FhevmRelayerStatusType = "sdk-loading" | "sdk-loaded" | "sdk-initializing" | "sdk-initialized" | "creating";

async function getChainId(providerOrUrl: Eip1193Provider | string): Promise<number> {
  if (typeof providerOrUrl === "string") { const provider = new JsonRpcProvider(providerOrUrl); return Number((await provider.getNetwork()).chainId); }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" }); return Number.parseInt(chainId as string, 16);
}

async function getWeb3Client(rpcUrl: string) { const rpc = new JsonRpcProvider(rpcUrl); try { const version = await rpc.send("web3_clientVersion", []); return version; } finally { rpc.destroy(); } }

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<{ ACLAddress: `0x${string}`; InputVerifierAddress: `0x${string}`; KMSVerifierAddress: `0x${string}` } | undefined> {
  const version = await getWeb3Client(rpcUrl);
  if (typeof version !== "string" || !version.toLowerCase().includes("hardhat")) return undefined;
  try { return await getFHEVMRelayerMetadata(rpcUrl); } catch { return undefined; }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) { const rpc = new JsonRpcProvider(rpcUrl); try { const version = await rpc.send("fhevm_relayer_metadata", []); return version; } finally { rpc.destroy(); } }

type ResolveResult = { isMock: true; chainId: number; rpcUrl: string } | { isMock: false; chainId: number; rpcUrl?: string };

async function resolve(providerOrUrl: Eip1193Provider | string, mockChains?: Record<number, string>): Promise<ResolveResult> {
  const chainId = await getChainId(providerOrUrl);
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;
  const _mockChains: Record<number, string> = { 31337: "http://localhost:8545", ...(mockChains ?? {}) };
  if (Object.prototype.hasOwnProperty.call(_mockChains, chainId)) { if (!rpcUrl) rpcUrl = _mockChains[chainId]; return { isMock: true, chainId, rpcUrl: rpcUrl! }; }
  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: { provider: Eip1193Provider | string; mockChains?: Record<number, string>; signal: AbortSignal; onStatusChange?: (status: FhevmRelayerStatusType) => void; }): Promise<FhevmInstance> => {
  const { signal, onStatusChange, provider: providerOrUrl, mockChains } = parameters;
  const throwIfAborted = () => { if (signal.aborted) throw new FhevmAbortError(); };
  const notify = (s: FhevmRelayerStatusType) => { onStatusChange?.(s); };

  const { isMock, rpcUrl } = await resolve(providerOrUrl, mockChains);
  if (isMock) {
    const meta = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
    if (meta) {
      notify("creating");
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({ rpcUrl: rpcUrl!, chainId: await getChainId(providerOrUrl), metadata: meta });
      throwIfAborted();
      return mockInstance;
    }
  }

  throwIfAborted();
  if (!isFhevmWindowType(window, console.log)) { notify("sdk-loading"); await fhevmLoadSDK(); throwIfAborted(); notify("sdk-loaded"); }
  if (!isFhevmInitialized()) { notify("sdk-initializing"); await fhevmInitSDK(); throwIfAborted(); notify("sdk-initialized"); }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;
  const aclAddress = (relayerSDK as any).SepoliaConfig.aclContractAddress;
  if (!checkIsAddress(aclAddress)) throw new Error(`Invalid address: ${aclAddress}`);
  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();
  const config: FhevmInstanceConfig = { ...(relayerSDK as any).SepoliaConfig, network: providerOrUrl, publicKey: pub.publicKey, publicParams: pub.publicParams } as any;
  notify("creating");
  const instance = await relayerSDK.createInstance(config);
  await publicKeyStorageSet(aclAddress, instance.getPublicKey(), instance.getPublicParams(2048));
  throwIfAborted();
  return instance;
};


