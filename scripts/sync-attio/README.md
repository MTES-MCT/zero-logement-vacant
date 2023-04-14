## Sync with Attio
Establishments and users are pushed to Attio **every 2 hours**.

### Technical details
All establishments and their users are retrieved from the database as a stream
(using `pg-query-stream`). For each record, an HTTP PATCH request is sent to
Attio to edit the record partially. Errors get collected and are logged in the
output of the script.

### Optimizations
Because Attio is rate-limited, we limit the amount of outgoing requests on our
side to avoid having a complex _retry_ implementation.
