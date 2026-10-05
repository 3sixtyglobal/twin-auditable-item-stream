# TWIN Auditable Item Stream

This repository provides a complete auditable item stream stack for defining contracts, running stream operations, and consuming stream APIs from client applications. The packages are designed to work together so stream data stays consistent from model definition through to service execution and client integration.

The overall aim is to make audit-friendly event and record timelines straightforward to build and maintain, with reusable building blocks that can be composed into larger systems without duplicating core stream logic.

## Packages

- [auditable-item-stream-models](packages/auditable-item-stream-models/README.md) - Shared data contracts, schemas, and topic constants for auditable item stream components.
- [auditable-item-stream-service](packages/auditable-item-stream-service/README.md) - Service implementation and REST route generation for managing auditable streams and entries.
- [auditable-item-stream-rest-client](packages/auditable-item-stream-rest-client/README.md) - HTTP client for interacting with auditable stream service endpoints.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-auditable-item-stream](https://github.com/iotaledger/twin-auditable-item-stream) repository.
