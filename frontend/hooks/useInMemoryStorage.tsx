"use client";

import { createContext, ReactNode, useContext, useState } from "react";

export interface GenericStringStorage {
  getItem(key: string): string | Promise<string | null> | null;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

class GenericStringInMemoryStorage implements GenericStringStorage {
  #store = new Map<string, string>();
  getItem(key: string) { return this.#store.has(key) ? this.#store.get(key)! : null; }
  setItem(key: string, value: string) { this.#store.set(key, value); }
  removeItem(key: string) { this.#store.delete(key); }
}

interface UseInMemoryStorageState { storage: GenericStringStorage }

const InMemoryStorageContext = createContext<UseInMemoryStorageState | undefined>(undefined);

export const InMemoryStorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storage] = useState<GenericStringStorage>(new GenericStringInMemoryStorage());
  return <InMemoryStorageContext.Provider value={{ storage }}>{children}</InMemoryStorageContext.Provider>;
};

export const useInMemoryStorage = () => {
  const ctx = useContext(InMemoryStorageContext);
  if (!ctx) throw new Error("useInMemoryStorage must be used within InMemoryStorageProvider");
  return ctx;
};


