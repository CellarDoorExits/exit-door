/**
 * Module F: Dispute Record — Track disputes at exit time
 */

export type DisputeType = "service" | "payment" | "conduct" | "data" | "other";
export type ResolutionStatus = "open" | "resolved" | "escalated" | "withdrawn";

export interface DisputeModule {
  moduleType: "dispute";
  disputeType: DisputeType;
  filedBy: string;
  description: string;
  evidence: string[];
  resolutionStatus: ResolutionStatus;
  filedAt: string;
}

export interface CreateDisputeOpts {
  disputeType: DisputeType;
  filedBy: string;
  description: string;
  evidence?: string[];
  resolutionStatus?: ResolutionStatus;
  filedAt?: string;
}

/**
 * Create a dispute module for tracking disputes at exit time.
 *
 * @param opts - Options including dispute type, filer, description, and optional evidence/status.
 * @returns A {@link DisputeModule} with the specified dispute details.
 */
export function createDisputeModule(opts: CreateDisputeOpts): DisputeModule {
  return {
    moduleType: "dispute",
    disputeType: opts.disputeType,
    filedBy: opts.filedBy,
    description: opts.description,
    evidence: opts.evidence ?? [],
    resolutionStatus: opts.resolutionStatus ?? "open",
    filedAt: opts.filedAt ?? new Date().toISOString(),
  };
}
