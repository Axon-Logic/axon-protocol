//! AgentVault — holds funds for an autonomous agent with policy-enforced spending.
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct VaultConfig {
    pub owner: Address,
    pub agent: Address,
    pub policy_engine: Address,
    pub token: Address,
}

#[contracttype]
pub enum DataKey {
    Config,
    Balance,
}

#[contract]
pub struct AgentVault;

#[contractimpl]
impl AgentVault {
    /// Initialize vault with owner, agent, policy engine, and token.
    pub fn initialize(
        env: Env,
        owner: Address,
        agent: Address,
        policy_engine: Address,
        token: Address,
    ) {
        owner.require_auth();
        assert!(
            !env.storage().instance().has(&DataKey::Config),
            "already initialized"
        );
        env.storage().instance().set(
            &DataKey::Config,
            &VaultConfig { owner, agent, policy_engine, token },
        );
    }

    /// Deposit tokens into the vault.
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let cfg: VaultConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        token::Client::new(&env, &cfg.token).transfer(&from, &env.current_contract_address(), &amount);
        let bal: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage().instance().set(&DataKey::Balance, &(bal + amount));
        env.events().publish((Symbol::new(&env, "deposit"),), (from, amount));
    }

    /// Spend from vault — agent calls this; policy engine validates.
    pub fn spend(env: Env, to: Address, amount: i128, memo: Symbol) {
        let cfg: VaultConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        cfg.agent.require_auth();

        #[cfg(not(test))]
        {
            let policy_client = policy_engine::Client::new(&env, &cfg.policy_engine);
            policy_client.check_spend(&env.current_contract_address(), &to, &amount, &memo);
        }

        let bal: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        assert!(bal >= amount, "insufficient balance");
        token::Client::new(&env, &cfg.token).transfer(&env.current_contract_address(), &to, &amount);
        env.storage().instance().set(&DataKey::Balance, &(bal - amount));
        env.events().publish((Symbol::new(&env, "spend"),), (to, amount, memo));
    }

    /// Owner withdraws remaining funds.
    pub fn withdraw(env: Env, amount: i128) {
        let cfg: VaultConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        cfg.owner.require_auth();
        let bal: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        assert!(bal >= amount, "insufficient balance");
        token::Client::new(&env, &cfg.token).transfer(&env.current_contract_address(), &cfg.owner, &amount);
        env.storage().instance().set(&DataKey::Balance, &(bal - amount));
    }

    pub fn balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    pub fn config(env: Env) -> VaultConfig {
        env.storage().instance().get(&DataKey::Config).unwrap()
    }
}

#[cfg(not(test))]
mod policy_engine {
    soroban_sdk::contractimport!(
        file = "../policy-engine/target/wasm32-unknown-unknown/release/policy_engine.wasm"
    );
}

mod test;
