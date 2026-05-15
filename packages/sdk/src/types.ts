export type VaultConfig = {
  owner: string;
  agent: string;
  policyEngine: string;
  token: string;
};

export type SpendPolicy = {
  maxPerTx: bigint;
  maxPerPeriod: bigint;
  periodLedgers: number;
  allowlist: string[];
};

export type AgentRecord = {
  owner: string;
  vault: string;
  metadataUri: string;
  active: boolean;
};

export type SpendParams = {
  to: string;
  amount: bigint;
  memo: string;
};
