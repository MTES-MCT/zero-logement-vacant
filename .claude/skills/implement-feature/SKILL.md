---
name: implement-feature
description: >
  ZLV feature development workflow orchestrator.
  Use when starting any frontend, backend, or fullstack feature.
  Inputs: optional Figma URL, optional PO ticket/instructions.
  Brainstorming is mandatory when no instructions are provided.
---

# Implement Feature — ZLV Workflow

## Inputs
- **Figma URL** — required for frontend or fullstack features
- **PO instructions / ticket** — optional; if absent, brainstorming is mandatory
- **Scope** — `frontend` | `backend` | `fullstack`

## Steps

### 1 — Read the design (if Figma URL present)
Use `figma:implement-design` to fetch design context and screenshot before anything else.

### 2 — Brainstorm
- No PO instructions → `superpowers:brainstorming` is **mandatory**. Block until user approves design.
- PO instructions present → offer brainstorming. If user declines, confirm understanding before proceeding.

### 3 — Plan
Use `superpowers:writing-plans`. Save to `docs/plans/YYYY-MM-DD-<feature>.md`.

### 4 — TDD
Use `superpowers:test-driven-development`. All failing tests written before any implementation.

### 5 — Implement
For frontend or fullstack:
- Use `vercel-react-best-practices` before writing React components.
- Use `vercel-composition-patterns` when designing component APIs.
- Follow `figma-design-system.md` rule for styling.

For backend or fullstack:
- Follow the mandatory order: router → controller → repository.

### 6 — Verify
Use `superpowers:verification-before-completion`.
For frontend: visual comparison with Figma screenshot is required.

### 7 — Review
Use `superpowers:requesting-code-review`.
