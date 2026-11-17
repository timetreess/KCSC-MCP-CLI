# Design notes

## Metadata freshness

Concurrent CodeList calls share one in-flight request. Completed responses are not cached, so a later search reads current metadata rather than reusing a time-to-live snapshot.

## Clause retrieval

Candidate documents are read sequentially. Existing injected-fetch measurements showed that normal five-candidate searches completed in 156–683 ms. Parallel requests were not added because that path was not a measured bottleneck and concurrent calls would increase load on KCSC.

The clause search has a 30-second total budget in addition to the per-request timeout. Candidates not read before the budget expires are reported as failures so callers can see that the result is incomplete.

## Search scope

Candidate discovery uses CodeList names and classification paths, not a full-text index. When metadata does not identify a candidate, the service reports `unresolved` instead of interpreting an empty clause list as a negative finding.
