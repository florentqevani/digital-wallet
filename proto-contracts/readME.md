# Proto Contracts

Shared gRPC protocol buffer definitions for all MyApp microservices.

## Structure

\`\`\`
proto-contracts/
├── package.json          ← Makes this an npm package
├── index.js             ← Helper functions
├── proto/
│   ├── auth.proto       ← AuthService definition
│   └── log.proto        ← LogService definition
└── README.md
\`\`\`

## Usage in Other Projects

### Installation

Each service that needs to call gRPC services should install this package:

\`\`\`bash
npm install file:../proto-contracts
\`\`\`

### Loading Proto Files

In your Node.js service:

\`\`\`javascript
const proto = require('@grpc/proto-loader');
const protoContracts = require('@myapp/proto-contracts');

// Load the auth.proto file
const protoPath = protoContracts.loadProto('auth.proto');
const packageDefinition = proto.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
\`\`\`

## When to Update

Update this package when:
- Adding a new gRPC service
- Adding a new RPC method
- Changing message structure (carefully!)

## Backward Compatibility Rules

Proto3 rules:
- ✅ Adding new optional fields — always OK
- ✅ Removing fields you don't use — OK
- ❌ Changing field numbers — breaks everything
- ❌ Removing fields other services use — breaks those services