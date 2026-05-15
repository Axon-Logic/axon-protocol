import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import type { AgentRecord } from "./types.js";

export class RegistryClient {
  private server: SorobanRpc.Server;
  private contract: Contract;

  constructor(
    private contractId: string,
    private network: NetworkConfig,
  ) {
    this.server = new SorobanRpc.Server(network.rpcUrl);
    this.contract = new Contract(contractId);
  }

  async register(
    ownerKeypair: Keypair,
    agentAddress: string,
    vaultAddress: string,
    metadataUri: string,
  ): Promise<string> {
    const account = await this.server.getAccount(ownerKeypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.network.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          "register",
          new Address(ownerKeypair.publicKey()).toScVal(),
          new Address(agentAddress).toScVal(),
          new Address(vaultAddress).toScVal(),
          nativeToScVal(metadataUri, { type: "string" }),
        ),
      )
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (!SorobanRpc.Api.isSimulationSuccess(sim)) {
      throw new Error(`Simulation failed: ${JSON.stringify(sim)}`);
    }
    const prepared = SorobanRpc.assembleTransaction(tx, sim).build();
    prepared.sign(ownerKeypair);
    const result = await this.server.sendTransaction(prepared);
    return result.hash;
  }

  async getAgent(_agentAddress: string): Promise<AgentRecord | null> {
    // Full impl would simulate and decode XDR result
    return null;
  }
}
