// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemStreamBase } from "../IAuditableItemStreamBase.js";

/**
 * Create an auditable item stream.
 */
export interface IAuditableItemStreamCreateRequest {
	/**
	 * The data to be used in the stream.
	 */
	body: IAuditableItemStreamBase;
}
