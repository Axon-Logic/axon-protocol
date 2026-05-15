#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Env, Map,
};

fn setup() -> (Env, PolicyEngineClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, PolicyEngine);
    let client = PolicyEngineClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

fn make_policy(env: &Env, max_per_tx: i128, max_per_period: i128, period_ledgers: u32) -> SpendPolicy {
    SpendPolicy {
        max_per_tx,
        max_per_period,
        period_ledgers,
        allowlist: Map::new(env),
    }
}

#[test]
fn test_initialize() {
    setup(); // no panic = success
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let (_, client, admin) = setup();
    client.initialize(&admin);
}

#[test]
fn test_set_and_get_policy() {
    let (env, client, admin) = setup();
    let vault = Address::generate(&env);
    let policy = make_policy(&env, 1000, 5000, 100);
    client.set_policy(&admin, &vault, &policy);
    let stored = client.get_policy(&vault);
    assert_eq!(stored.max_per_tx, 1000);
    assert_eq!(stored.max_per_period, 5000);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_set_policy_non_admin_panics() {
    let (env, client, _admin) = setup();
    let vault = Address::generate(&env);
    let attacker = Address::generate(&env);
    client.set_policy(&attacker, &vault, &make_policy(&env, 100, 500, 10));
}

#[test]
fn test_check_spend_within_limits() {
    let (env, client, admin) = setup();
    let vault = Address::generate(&env);
    let to = Address::generate(&env);
    client.set_policy(&admin, &vault, &make_policy(&env, 500, 1000, 100));
    // Two spends within period limit
    client.check_spend(&vault, &to, &400, &Symbol::new(&env, "pay"));
    client.check_spend(&vault, &to, &400, &Symbol::new(&env, "pay"));
}

#[test]
#[should_panic(expected = "exceeds max per-tx limit")]
fn test_check_spend_exceeds_per_tx() {
    let (env, client, admin) = setup();
    let vault = Address::generate(&env);
    let to = Address::generate(&env);
    client.set_policy(&admin, &vault, &make_policy(&env, 100, 1000, 100));
    client.check_spend(&vault, &to, &101, &Symbol::new(&env, "pay"));
}

#[test]
#[should_panic(expected = "exceeds period spend limit")]
fn test_check_spend_exceeds_period_limit() {
    let (env, client, admin) = setup();
    let vault = Address::generate(&env);
    let to = Address::generate(&env);
    client.set_policy(&admin, &vault, &make_policy(&env, 600, 1000, 100));
    client.check_spend(&vault, &to, &600, &Symbol::new(&env, "pay"));
    client.check_spend(&vault, &to, &600, &Symbol::new(&env, "pay")); // 1200 > 1000
}

#[test]
fn test_period_resets_after_expiry() {
    let (env, client, admin) = setup();
    let vault = Address::generate(&env);
    let to = Address::generate(&env);
    client.set_policy(&admin, &vault, &make_policy(&env, 600, 1000, 10));
    client.check_spend(&vault, &to, &600, &Symbol::new(&env, "pay"));

    // Advance ledger past period
    env.ledger().with_mut(|l| l.sequence_number += 11);
    // Should succeed — period reset
    client.check_spend(&vault, &to, &600, &Symbol::new(&env, "pay"));
}

#[test]
#[should_panic(expected = "no policy set for vault")]
fn test_check_spend_no_policy_panics() {
    let (env, client, _) = setup();
    let vault = Address::generate(&env);
    let to = Address::generate(&env);
    client.check_spend(&vault, &to, &100, &Symbol::new(&env, "pay"));
}
