// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { type ITelemetryMetric, MetricType } from "@3sixty/telemetry-models";
import { AuditableItemStreamMetricIds } from "./auditableItemStreamMetricIds.js";

/**
 * Metrics registered by the auditable item stream service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamMetrics: ITelemetryMetric[] = [
	{
		id: AuditableItemStreamMetricIds.StreamsCreated,
		label: "Streams created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.StreamsUpdated,
		label: "Streams updated",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.StreamsClosed,
		label: "Streams closed",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.StreamsDeleted,
		label: "Streams deleted",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.EntriesCreated,
		label: "Stream entries created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.EntriesUpdated,
		label: "Stream entries updated",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.EntriesDeleted,
		label: "Stream entries soft-deleted",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.ProofsCreatedStream,
		label: "Stream-level proofs created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.ProofsCreatedEntry,
		label: "Entry-level proofs created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.ProofsRemovedStream,
		label: "Stream-level proofs removed",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.ProofsRemovedEntry,
		label: "Entry-level proofs removed",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.AppendOnlyRejections,
		label: "AppendOnly mode write rejections",
		type: MetricType.Counter
	},
	{
		id: AuditableItemStreamMetricIds.ClosedStreamRejections,
		label: "Closed-stream write rejections",
		type: MetricType.Counter
	}
];
