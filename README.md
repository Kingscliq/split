# Split

Split is a Stellar-powered group payment tracker for shared bills, contributions, and real-time payment status tracking.

## Project Structure

```text
.
├── contracts
│   └── split_contract
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       ├── SPEC.md
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- `contracts/split_contract/` contains the dedicated Split Soroban contract.
- `contracts/split_contract/SPEC.md` defines the contract data model and API.
- `docs/architecture-overview.md` defines the product and system architecture.
