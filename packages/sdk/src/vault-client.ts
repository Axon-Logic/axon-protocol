import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import type { NetworkConfig } from "./network.js";
import type { SpendParams, VaultConfig } from "./types.js";

export class AgentVaultClient {
  private server: rpc.Server;
  private contract: Contract;

  constructor(
    private contractId: string,
    private network: NetworkConfig,
  ) {
    this.server = new rpc.Server(network.rpcUrl);
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

  /**
   * Read the vault balance. Simulation needs a funded source account, so pass
   * any account that exists on the target network (e.g. the vault owner).
   */
  async balance(sourceAccount = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"): Promise<bigint> {
    const account = await this.server.getAccount(sourceAccount);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.network.networkPassphrase,
    })
      .addOperation(this.contract.call("balance"))
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(result) && result.result) {
      // scValToNative decodes the i128 return value; `.value()` on an ScVal
      // returns the raw Int128 parts, not a numeric value.
      return BigInt(scValToNative(result.result.retval));
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
    if (!rpc.Api.isSimulationSuccess(simResult)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simResult)}`);
    }

    const prepared = rpc.assembleTransaction(tx, simResult).build();
    prepared.sign(signer);

    const sendResult = await this.server.sendTransaction(prepared);
    return sendResult.hash;
  }
}
