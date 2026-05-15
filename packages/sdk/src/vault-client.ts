import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import type { SpendParams, VaultConfig } from "./types.js";

export class AgentVaultClient {
  private server: SorobanRpc.Server;
  private contract: Contract;

  constructor(
    private contractId: string,
    private network: NetworkConfig,
  ) {
    this.server = new SorobanRpc.Server(network.rpcUrl);
    this.contract = new Contract(contractId);
  }

  async deposit(signer: Keypair, amount: bigint): Promise<string> {
    return this.invoke(signer, "deposit", [
      new Address(signer.publicKey()).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
    ]);
  }

  async spend(agentKeypair: Keypair, params: SpendParams): Promise<string> {
    return this.invoke(agentKeypair, "spend", [
      new Address(params.to).toScVal(),
      nativeToScVal(params.amount, { type: "i128" }),
      nativeToScVal(params.memo, { type: "symbol" }),
    ]);
  }

  async balance(): Promise<bigint> {
    const account = await this.server.getAccount("GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.network.networkPassphrase,
    })
      .addOperation(this.contract.call("balance"))
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationSuccess(result) && result.result) {
      return BigInt(result.result.retval.value()?.toString() ?? "0");
    }
    return 0n;
  }

  async getConfig(): Promise<VaultConfig | null> {
    // Simplified — full impl would decode XDR
    return null;
  }

  private async invoke(signer: Keypair, method: string, args: unknown[]): Promise<string> {
    const account = await this.server.getAccount(signer.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.network.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...(args as Parameters<typeof this.contract.call>[1][])))
      .setTimeout(30)
      .build();

    const simResult = await this.server.simulateTransaction(tx);
    if (!SorobanRpc.Api.isSimulationSuccess(simResult)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simResult)}`);
    }

    const prepared = SorobanRpc.assembleTransaction(tx, simResult).build();
    prepared.sign(signer);

    const sendResult = await this.server.sendTransaction(prepared);
    return sendResult.hash;
  }
}
