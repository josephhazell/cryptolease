import { SDK_CDN_URL } from "./constants";

type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

export type FhevmRelayerSDKType = {
  initSDK: (opts?: unknown) => Promise<boolean>;
  createInstance: (config: unknown) => Promise<any>;
  SepoliaConfig: Record<string, unknown> & { aclContractAddress: `0x${string}` };
  __initialized__?: boolean;
};

export type FhevmWindowType = {
  relayerSDK: FhevmRelayerSDKType;
};

export class RelayerSDKLoader {
  private _trace?: TraceType;
  constructor(options: { trace?: TraceType }) { this._trace = options.trace; }
  public isLoaded() {
    if (typeof window === "undefined") throw new Error("RelayerSDKLoader: can only be used in the browser.");
    return isFhevmWindowType(window, this._trace);
  }
  public load(): Promise<void> {
    if (typeof window === "undefined") return Promise.reject(new Error("RelayerSDKLoader: can only be used in the browser."));
    if ("relayerSDK" in window) {
      if (!isFhevmRelayerSDKType((window as any).relayerSDK, this._trace)) throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_CDN_URL}"]`);
      if (existing) {
        if (!isFhevmWindowType(window, this._trace)) reject(new Error("RelayerSDKLoader: invalid window.relayerSDK"));
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = SDK_CDN_URL; script.type = "text/javascript"; script.async = true;
      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) { reject(new Error(`RelayerSDKLoader: Relayer SDK loaded but invalid`)); return; }
        resolve();
      };
      script.onerror = () => reject(new Error(`RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`));
      document.head.appendChild(script);
    });
  }
}

function objHasProperty<T extends object, K extends PropertyKey, V extends string>(obj: T, propertyName: K, propertyType: V, trace?: TraceType): obj is T & Record<K, any> {
  if (!obj || typeof obj !== "object") return false;
  if (!(propertyName in obj)) { trace?.(`missing ${String(propertyName)}`); return false; }
  const value = (obj as Record<K, unknown>)[propertyName];
  if (value === null || value === undefined) return false;
  if (typeof value !== propertyType) return false;
  return true;
}

export function isFhevmRelayerSDKType(o: unknown, trace?: TraceType): o is FhevmRelayerSDKType {
  if (typeof o !== "object" || o === null) return false;
  if (!objHasProperty(o as object, "initSDK", "function", trace)) return false;
  if (!objHasProperty(o as object, "createInstance", "function", trace)) return false;
  if (!objHasProperty(o as object, "SepoliaConfig", "object", trace)) return false;
  return true;
}

export function isFhevmWindowType(win: unknown, trace?: TraceType): win is FhevmWindowType {
  if (typeof win !== "object" || win === null) return false;
  if (!("relayerSDK" in (win as any))) { trace?.("window missing relayerSDK"); return false; }
  return isFhevmRelayerSDKType((win as any).relayerSDK);
}


