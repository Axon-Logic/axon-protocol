import { AgentVaultClient } from "../vault-client";
import { RegistryClient } from "../registry-client";
import { NETWORKS } from "../network";

// Mock the entire Stellar SDK to avoid real network calls
jest.mock("@stellar/stellar-sdk", () => {
  const mockTx = { sign: jest.fn(), toXDR: jest.fn(() => "xdr") };
  const mockBuilder = {
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn(() => mockTx),
  };
  return {
    Contract: jest.fn().mockImplementation(() => ({ call: jest.fn(() => ({})) })),
    SorobanRpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({ id: "GABC", sequence: "1" }),
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: { value: () => "1000" } },
          transactionData: {},
          minResourceFee: "100",
        }),
        sendTransaction: jest.fn().mockResolvedValue({ hash: "abc123" }),
      })),
      Api: { isSimulationSuccess: jest.fn(() => true) },
      assembleTransaction: jest.fn(() => ({ build: jest.fn(() => mockTx) })),
    },
    TransactionBuilder: jest.fn(() => mockBuilder),
    BASE_FEE: "100",
    Keypair: {
      fromSecret: jest.fn(() => ({
        publicKey: () => "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        sign: jest.fn(),
      })),
    },
    nativeToScVal: jest.fn(() => ({})),
    Address: jest.fn().mockImplementation(() => ({ toScVal: jest.fn(() => ({})) })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SorobanRpc, Keypair } = require("@stellar/stellar-sdk");

const network = NETWORKS.testnet;
const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

describe("AgentVaultClient", () => {
  let client: AgentVaultClient;
  beforeEach(() => { client = new AgentVaultClient(CONTRACT_ID, network); });

  it("constructs without throwing", () => {
    expect(client).toBeDefined();
  });

  it("deposit() returns a tx hash", async () => {
    const signer = Keypair.fromSecret("S...");
    const hash = await client.deposit(signer, 500n);
    expect(hash).toBe("abc123");
  });

  it("spend() returns a tx hash", async () => {
    const signer = Keypair.fromSecret("S...");
    const hash = await client.spend(signer, { to: "GBOB", amount: 100n, memo: "pay" });
    expect(hash).toBe("abc123");
  });

  it("balance() returns a bigint", async () => {
    const bal = await client.balance();
    expect(typeof bal).toBe("bigint");
  });

  it("getConfig() returns null (stub)", async () => {
    expect(await client.getConfig()).toBeNull();
  });

  it("throws when simulation fails", async () => {
    (SorobanRpc.Api.isSimulationSuccess as jest.Mock).mockReturnValueOnce(false);
    const signer = Keypair.fromSecret("S...");
    await expect(client.deposit(signer, 100n)).rejects.toThrow("Simulation failed");
  });
});

describe("RegistryClient", () => {
  let client: RegistryClient;
  beforeEach(() => { client = new RegistryClient(CONTRACT_ID, network); });

  it("constructs without throwing", () => {
    expect(client).toBeDefined();
  });

  it("register() returns a tx hash", async () => {
    const owner = Keypair.fromSecret("S...");
    const hash = await client.register(owner, "GAGENT", "GVAULT", "ipfs://Qm123");
    expect(hash).toBe("abc123");
  });

  it("getAgent() returns null (stub)", async () => {
    expect(await client.getAgent("GAGENT")).toBeNull();
  });
});

describe("NETWORKS", () => {
  it("testnet has required fields", () => {
    expect(NETWORKS.testnet.rpcUrl).toBeTruthy();
    expect(NETWORKS.testnet.networkPassphrase).toBeTruthy();
    expect(NETWORKS.testnet.horizonUrl).toBeTruthy();
  });

  it("mainnet has required fields", () => {
    expect(NETWORKS.mainnet.rpcUrl).toBeTruthy();
    expect(NETWORKS.mainnet.networkPassphrase).toBeTruthy();
  });
});
