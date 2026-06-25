# Auditable Item Stream Packages

## auditable-item-stream-models

This package defines shared contracts, schemas, contexts, and event topics for auditable item stream workflows. It provides the common structure that allows service and client layers to interoperate consistently, with data aligned to broadly used linked data conventions such as [JSON-LD](https://json-ld.org/) and [Schema.org](https://schema.org/).

- [README](../packages/auditable-item-stream-models/README.md)
- [Examples](../packages/auditable-item-stream-models/docs/examples.md)
- [Changelog](../packages/auditable-item-stream-models/docs/changelog.md)

## auditable-item-stream-service

This package implements the operational stream logic, including stream creation, entry management, verification support, and REST route generation. It acts as the backend execution layer that applies the shared contracts and exposes the behaviour needed to run auditable stream APIs.

- [README](../packages/auditable-item-stream-service/README.md)
- [Examples](../packages/auditable-item-stream-service/docs/examples.md)
- [Changelog](../packages/auditable-item-stream-service/docs/changelog.md)

## auditable-item-stream-rest-client

This package provides a client interface for interacting with auditable stream service endpoints over HTTP. It is designed to simplify integration from consuming applications by wrapping stream and entry operations in a consistent set of request methods.

- [README](../packages/auditable-item-stream-rest-client/README.md)
- [Examples](../packages/auditable-item-stream-rest-client/docs/examples.md)
- [Changelog](../packages/auditable-item-stream-rest-client/docs/changelog.md)
