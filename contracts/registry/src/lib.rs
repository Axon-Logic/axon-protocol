//! Registry — on-chain directory of agents and their associated vaults.
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct AgentRecord {
    pub owner: Address,
    pub vault: Address,
    pub metadata_uri: String, // off-chain metadata (IPFS / Arweave)
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Agent(Address),
}

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn register(env: Env, owner: Address, agent: Address, vault: Address, metadata_uri: String) {
        owner.require_auth();
        assert!(
            !env.storage().persistent().has(&DataKey::Agent(agent.clone())),
            "agent already registered"
        );
        env.storage().persistent().set(
            &DataKey::Agent(agent.clone()),
            &AgentRecord { owner, vault, metadata_uri, active: true },
        );
        env.events().publish((Symbol::new(&env, "registered"),), agent);
    }

    pub fn deactivate(env: Env, owner: Address, agent: Address) {
        owner.require_auth();
        let mut record: AgentRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Agent(agent.clone()))
            .expect("agent not found");
        assert!(record.owner == owner, "unauthorized");
        record.active = false;
        env.storage().persistent().set(&DataKey::Agent(agent.clone()), &record);
        env.events().publish((Symbol::new(&env, "deactivated"),), agent);
    }

    pub fn get_agent(env: Env, agent: Address) -> AgentRecord {
        env.storage().persistent().get(&DataKey::Agent(agent)).expect("agent not found")
    }
}

mod test;
