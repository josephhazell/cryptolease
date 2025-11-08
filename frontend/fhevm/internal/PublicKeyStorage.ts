import { openDB, type DBSchema, type IDBPDatabase } from "idb";

type FhevmStoredPublicKey = { publicKeyId: string; publicKey: Uint8Array };
type FhevmStoredPublicParams = { publicParamsId: string; publicParams: Uint8Array };

interface PublicParamsDB extends DBSchema {
  publicKeyStore: { key: string; value: { acl: `0x${string}`; value: FhevmStoredPublicKey } };
  paramsStore: { key: string; value: { acl: `0x${string}`; value: FhevmStoredPublicParams } };
}

let __dbPromise: Promise<IDBPDatabase<PublicParamsDB>> | undefined = undefined;

async function _getDB(): Promise<IDBPDatabase<PublicParamsDB> | undefined> {
  if (__dbPromise) return __dbPromise;
  if (typeof window === "undefined") return undefined;
  __dbPromise = openDB<PublicParamsDB>("fhevm", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("paramsStore")) db.createObjectStore("paramsStore", { keyPath: "acl" });
      if (!db.objectStoreNames.contains("publicKeyStore")) db.createObjectStore("publicKeyStore", { keyPath: "acl" });
    }
  });
  return __dbPromise;
}

export async function publicKeyStorageGet(aclAddress: `0x${string}`): Promise<{ publicKey?: { data: Uint8Array | null; id: string | null }; publicParams: { "2048": { publicParamsId: string; publicParams: Uint8Array } } | null }> {
  const db = await _getDB();
  if (!db) return { publicParams: null };
  let storedPublicKey: FhevmStoredPublicKey | null = null;
  try { const pk = await db.get("publicKeyStore", aclAddress); if (pk?.value) storedPublicKey = pk.value; } catch {}
  let storedPublicParams: FhevmStoredPublicParams | null = null;
  try { const pp = await db.get("paramsStore", aclAddress); if (pp?.value) storedPublicParams = pp.value; } catch {}
  const publicKey = storedPublicKey ? { id: storedPublicKey.publicKeyId, data: storedPublicKey.publicKey } : undefined;
  const publicParams = storedPublicParams ? { "2048": storedPublicParams } : null;
  return { ...(publicKey ? { publicKey } : {}), publicParams };
}

export async function publicKeyStorageSet(
  aclAddress: `0x${string}`,
  publicKey: FhevmStoredPublicKey | null,
  publicParams: FhevmStoredPublicParams | null
) {
  const db = await _getDB();
  if (!db) return;
  if (publicKey) await db.put("publicKeyStore", { acl: aclAddress, value: publicKey });
  if (publicParams) await db.put("paramsStore", { acl: aclAddress, value: publicParams });
}


