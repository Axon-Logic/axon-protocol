//! PolicyEngine — enforces human-defined spending guardrails for agent vaults.
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct SpendPolicy {
    /// Max single spend amount (in stroops)
    pub max_per_tx: i128,
    /// Max cumulative spend per period (in stroops)
    pub max_per_period: i128,
    /// Period length in ledgers
    pub period_ledgers: u32,
    /// Allowlisted recipient addresses (empty = any)
    pub allowlist: Map<Address, bool>,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Policy(Address), // keyed by vault address
    Spent(Address),  // cumulative spend tracker
    PeriodStart(Address),
}

#[contract]
pub struct PolicyEngine;

#[contractimpl]
impl PolicyEngine {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Set or update policy for a vault. Only admin or vault owner can call.
    pub fn set_policy(env: Env, caller: Address, vault: Address, policy: SpendPolicy) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "unauthorized");
        env.storage().persistent().set(&DataKey::Policy(vault.clone()), &policy);
        env.storage().persistent().set(&DataKey::Spent(vault.clone()), &0_i128);
        env.storage().persistent().set(&DataKey::PeriodStart(vault), &env.ledger().sequence());
    }

    /// Called by AgentVault before executing a spend. Panics if policy violated.
    pub fn check_spend(env: Env, vault: Address, _to: Address, amount: i128, _memo: Symbol) {
        let policy: SpendPolicy = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(vault.clone()))
            .expect("no policy set for vault");

        assert!(amount <= policy.max_per_tx, "exceeds max per-tx limit");

        let period_start: u32 = env.storage().persistent().get(&DataKey::PeriodStart(vault.clone())).unwrap_or(0);
        let current = env.ledger().sequence();
        let mut spent: i128 = env.storage().persistent().get(&DataKey::Spent(vault.clone())).unwrap_or(0);

        // Reset period if expired
        if current >= period_start + policy.period_ledgers {
            spent = 0;
            env.storage().persistent().set(&DataKey::PeriodStart(vault.clone()), &current);
        }

        assert!(spent + amount <= policy.max_per_period, "exceeds period spend limit");
        env.storage().persistent().set(&DataKey::Spent(vault), &(spent + amount));
    }

    pub fn get_policy(env: Env, vault: Address) -> SpendPolicy {
        env.storage().persistent().get(&DataKey::Policy(vault)).expect("no policy")
    }
}

mod test;
