"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type WalletState = {
  address: string | null;
  network: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState>({
  address: null,
  network: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Lazy-import to avoid SSR crash — freighter-api accesses window at module level
    import("@stellar/freighter-api").then(({ isConnected, getPublicKey, getNetworkDetails }) => {
      isConnected().then(async (ok) => {
        if (ok) {
          const [pub, net] = await Promise.all([getPublicKey(), getNetworkDetails()]);
          setAddress(pub);
          setNetwork(net.network);
        }
      });
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { requestAccess, getNetworkDetails } = await import("@stellar/freighter-api");
      const pub = await requestAccess();
      const net = await getNetworkDetails();
      setAddress(pub);
      setNetwork(net.network);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setNetwork(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, network, connected: !!address, connecting, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
