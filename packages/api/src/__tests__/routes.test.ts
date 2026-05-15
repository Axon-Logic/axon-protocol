import request from "supertest";
import app from "../app";

// Mock the SDK so tests don't hit the network
jest.mock("@axon-protocol/sdk", () => ({
  AgentVaultClient: jest.fn().mockImplementation(() => ({
    balance: jest.fn().mockResolvedValue(5000n),
    spend: jest.fn().mockResolvedValue("txhash_spend"),
    getConfig: jest.fn().mockResolvedValue(null),
  })),
  RegistryClient: jest.fn().mockImplementation(() => ({
    getAgent: jest.fn().mockResolvedValue({
      owner: "GOWNER",
      vault: "GVAULT",
      metadataUri: "ipfs://Qm",
      active: true,
    }),
    register: jest.fn().mockResolvedValue("txhash_register"),
  })),
  NETWORKS: {
    testnet: {
      rpcUrl: "https://soroban-testnet.stellar.org",
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  },
}));

jest.mock("@stellar/stellar-sdk", () => ({
  Keypair: {
    fromSecret: jest.fn(() => ({ publicKey: () => "GPUB" })),
  },
}));

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "axon-api" });
  });
});

describe("GET /agents/:address", () => {
  it("returns agent record", async () => {
    const res = await request(app).get("/agents/GAGENT");
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.vault).toBe("GVAULT");
  });

  it("returns 404 when getAgent returns null", async () => {
    const { RegistryClient } = await import("@axon-protocol/sdk");
    (RegistryClient as jest.Mock).mockImplementationOnce(() => ({
      getAgent: jest.fn().mockResolvedValue(null),
    }));
    const res = await request(app).get("/agents/GUNKNOWN");
    expect(res.status).toBe(404);
  });
});

describe("POST /agents/register", () => {
  const validBody = {
    ownerSecretKey: "SCZANGBA5YELHNLNPQB7YGQXNQKQNQKQNQKQNQKQNQKQNQKQNQKQNQK",
    agentAddress: "GAGENT",
    vaultAddress: "GVAULT",
    metadataUri: "https://example.com/meta.json",
  };

  it("returns 201 with txHash on valid body", async () => {
    const res = await request(app).post("/agents/register").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.txHash).toBe("txhash_register");
  });

  it("returns 400 on missing fields", async () => {
    const res = await request(app).post("/agents/register").send({ ownerSecretKey: "S..." });
    expect(res.status).toBe(400);
  });

  it("returns 400 when metadataUri is not a URL", async () => {
    const res = await request(app)
      .post("/agents/register")
      .send({ ...validBody, metadataUri: "not-a-url" });
    expect(res.status).toBe(400);
  });
});

describe("GET /vaults/:contractId/balance", () => {
  it("returns balance as string", async () => {
    const res = await request(app).get("/vaults/CCONTRACT/balance");
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe("5000");
  });
});

describe("POST /vaults/:contractId/spend", () => {
  const validBody = {
    agentSecretKey: "SCZANGBA5YELHNLNPQB7YGQXNQKQNQKQNQKQNQKQNQKQNQKQNQKQNQK",
    to: "GRECIPIENT",
    amount: "100",
    memo: "payment",
  };

  it("returns txHash on valid body", async () => {
    const res = await request(app).post("/vaults/CCONTRACT/spend").send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.txHash).toBe("txhash_spend");
  });

  it("returns 400 on missing fields", async () => {
    const res = await request(app).post("/vaults/CCONTRACT/spend").send({ to: "GREC" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when memo exceeds 32 chars", async () => {
    const res = await request(app)
      .post("/vaults/CCONTRACT/spend")
      .send({ ...validBody, memo: "a".repeat(33) });
    expect(res.status).toBe(400);
  });
});
