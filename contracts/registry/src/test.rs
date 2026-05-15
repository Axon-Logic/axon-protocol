#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

fn setup() -> (Env, RegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, Registry);
    let client = RegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_initialize() {
    setup();
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin) = setup();
    client.initialize(&admin);
}

#[test]
fn test_register_and_get_agent() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let vault = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://Qm123");

    client.register(&owner, &agent, &vault, &uri);

    let record = client.get_agent(&agent);
    assert_eq!(record.owner, owner);
    assert_eq!(record.vault, vault);
    assert!(record.active);
}

#[test]
#[should_panic(expected = "agent already registered")]
fn test_duplicate_register_panics() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let vault = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://Qm123");

    client.register(&owner, &agent, &vault, &uri);
    client.register(&owner, &agent, &vault, &uri);
}

#[test]
fn test_deactivate_agent() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let vault = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://Qm123");

    client.register(&owner, &agent, &vault, &uri);
    client.deactivate(&owner, &agent);

    let record = client.get_agent(&agent);
    assert!(!record.active);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_deactivate_wrong_owner_panics() {
    let (env, client, _) = setup();
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);
    let agent = Address::generate(&env);
    let vault = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://Qm123");

    client.register(&owner, &agent, &vault, &uri);
    client.deactivate(&attacker, &agent);
}

#[test]
#[should_panic(expected = "agent not found")]
fn test_get_unregistered_agent_panics() {
    let (env, client, _) = setup();
    let agent = Address::generate(&env);
    client.get_agent(&agent);
}
