#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token, Env};

fn setup() -> (Env, AgentVaultClient<'static>, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let policy_engine = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(owner.clone()).address();

    let contract_id = env.register_contract(None, AgentVault);
    let client = AgentVaultClient::new(&env, &contract_id);
    client.initialize(&owner, &agent, &policy_engine, &token_id);

    (env, client, owner, agent, policy_engine, token_id)
}

fn mint_and_deposit(env: &Env, client: &AgentVaultClient, owner: &Address, token_id: &Address, amount: i128) {
    token::StellarAssetClient::new(env, token_id).mint(owner, &amount);
    client.deposit(owner, &amount);
}

#[test]
fn test_initialize() {
    setup();
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let (env, client, owner, agent, policy_engine, token_id) = setup();
    client.initialize(&owner, &agent, &policy_engine, &token_id);
}

#[test]
fn test_initial_balance_is_zero() {
    let (_, client, _, _, _, _) = setup();
    assert_eq!(client.balance(), 0);
}

#[test]
fn test_config_stored_correctly() {
    let (_, client, owner, agent, policy_engine, token_id) = setup();
    let cfg = client.config();
    assert_eq!(cfg.owner, owner);
    assert_eq!(cfg.agent, agent);
    assert_eq!(cfg.policy_engine, policy_engine);
    assert_eq!(cfg.token, token_id);
}

#[test]
fn test_deposit_increases_balance() {
    let (env, client, owner, _, _, token_id) = setup();
    mint_and_deposit(&env, &client, &owner, &token_id, 1000);
    assert_eq!(client.balance(), 1000);

    mint_and_deposit(&env, &client, &owner, &token_id, 500);
    assert_eq!(client.balance(), 1500);
}

#[test]
fn test_withdraw_reduces_balance() {
    let (env, client, owner, _, _, token_id) = setup();
    mint_and_deposit(&env, &client, &owner, &token_id, 1000);

    client.withdraw(&owner, &400);
    assert_eq!(client.balance(), 600);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_withdraw_exceeds_balance_panics() {
    let (_, client, owner, _, _, _) = setup();
    client.withdraw(&owner, &1);
}

#[test]
fn test_spend_reduces_balance() {
    let (env, client, owner, agent, _, token_id) = setup();
    mint_and_deposit(&env, &client, &owner, &token_id, 1000);

    let recipient = Address::generate(&env);
    client.spend(&agent, &recipient, &300, &Symbol::new(&env, "pay"));
    assert_eq!(client.balance(), 700);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_spend_exceeds_balance_panics() {
    let (env, client, owner, agent, _, token_id) = setup();
    mint_and_deposit(&env, &client, &owner, &token_id, 100);

    let recipient = Address::generate(&env);
    client.spend(&agent, &recipient, &200, &Symbol::new(&env, "pay"));
}
