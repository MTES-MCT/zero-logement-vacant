# Deduplicate owners

## Why

We have duplicate owners in our database that should be merged to form
a single national owner.

## What

A script that deduplicates owners, run manually or as a cron job.

## How

A stream of our owners grouped by name is set up.
For each owner, find all owners with the same name.
For each list of owners with the same name:
- for each owner, compare it to all *other* owners in the list

We get a stream of comparisons that is forked into several streams:
- a stream recording the comparisons and logging stats about them
- a stream keeping and saving duplicates that need human review
- a stream keeping matches that can be merged automatically

Before merging, events, notes and attached housing are transferred to the owner
we keep. The duplicates get merged in this owner and it is saved to the
database, ending the transaction.

The reporter writes a report to the standard output.

## When

Whenever needed.
