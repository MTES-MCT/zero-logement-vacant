# AGENTS.md Configuration Design

**Date:** 2026-01-26

**Status:** ✅ Implemented

**Branch:** `ai/add-agents-md-configuration`

## Problem Statement

The repository used Claude-specific `CLAUDE.md` files for AI agent instructions, which are not discoverable by other AI coding assistants like GitHub Copilot, Cursor, Windsurf, and other tools that follow the emerging `AGENTS.md` open standard.

**Goals:**
1. Make instructions discoverable by all AI agents (vendor-neutral)
2. Improve overall documentation for frontend and server development
3. Maintain backward compatibility with Claude Code

## Solution Overview

### Architecture

Three-tier documentation structure following the AGENTS.md open standard:

```
zero-logement-vacant/
├── AGENTS.md              # Root - monorepo overview, shared conventions
├── CLAUDE.md → AGENTS.md  # Symlink for Claude compatibility
├── frontend/
│   ├── AGENTS.md          # Frontend-specific patterns
│   └── CLAUDE.md → AGENTS.md
├── server/
│   ├── AGENTS.md          # Backend-specific patterns
│   └── CLAUDE.md → AGENTS.md
└── packages/
    └── (optional future AGENTS.md files per package)
```

### Key Decisions

1. **Standards compliant:** Follows AGENTS.md open standard supported by 60k+ repositories
2. **Claude compatible:** Symlinks ensure Claude continues working without changes
3. **Monorepo optimized:** Agents read nearest AGENTS.md, getting context-appropriate instructions
4. **Incremental adoption:** Can add package-level AGENTS.md files later if needed
5. **Low maintenance:** Updates to AGENTS.md automatically reflect in CLAUDE.md via symlinks

## Implementation Details

### Root AGENTS.md

**Sections:**
- Project overview and tech stack
- Monorepo structure with navigation guide
- Essential commands (Nx via Yarn)
- Development workflow (environment, database, local dev)
- Cross-workspace patterns (shared code location, package imports)
- Test fixture pattern (critical: must extend shared DTOs)
- Testing strategy (TDD mandatory, Vitest, property-based testing)
- Common pitfalls

**Key additions:**
- Navigation guide for AI agents (when to work in each workspace)
- Cross-workspace patterns (how frontend/backend share types)
- Test fixture pattern enforcement (extend `gen*DTO()` from shared models)
- TDD requirement (tests MUST be written before implementation)

### Frontend AGENTS.md

**Sections:**
- Quick reference (agent-friendly task→solution mapping)
- Project structure and file naming conventions
- Styling guide with decision tree:
  - Component-scoped: styled components with Emotion (default)
  - Layout/UI: MUI Material components with default imports
  - Design compliance: DSFR components directly
  - Legacy patterns to avoid: SCSS modules
- Component architecture and patterns
- State management (Redux + RTK Query)
- Form handling (react-hook-form + yup preferred, legacy useForm deprecated)
- API integration patterns (RTK Query, transform/parse, error handling)
- Testing (Vitest, React Testing Library, MSW, TDD)
- Routing (React Router v6)
- Type patterns (DTOs, frontend models, payloads)
- Common pitfalls

**Corrected conventions:**
- Styled components with Emotion (not SCSS modules - legacy)
- Default imports for MUI (not barrel imports)
- Explicit rem spacing (not numeric multipliers)
- DSFR components directly (not `_dsfr/` wrappers - legacy)

### Server AGENTS.md

**Sections:**
- Quick reference with task→file path mapping
- Project structure
- API development workflow (step-by-step with TDD emphasis)
- Validation patterns (two systems: Yup + validatorNext vs express-validator)
- Controller patterns (method naming, type signatures, error handling)
- Repository patterns (standard methods, transaction handling)
- Authentication & authorization flow
- Testing (TDD mandatory, Vitest, property-based testing with fast-check)
- Error handling (custom HttpError classes)
- Model naming conventions
- Express app structure and middleware stack
- Database patterns (Knex, soft deletes, transactions)
- Common pitfalls

**Key patterns documented:**
- Validation happens in routers, not controllers
- Transaction handling: controllers start, repositories use `withinTransaction()`
- Test fixtures must extend `gen*DTO()` from shared models
- No try-catch needed in controllers (express-promise-router handles async errors)

## Migration & Compatibility

### Symlink Strategy

Created symlinks at three levels:
```bash
ln -sf AGENTS.md CLAUDE.md                    # root
ln -sf AGENTS.md frontend/CLAUDE.md           # frontend
ln -sf AGENTS.md server/CLAUDE.md             # server
```

### Git Considerations

- Symlinks committed to version control
- Talisman pre-commit hook updated to ignore AGENTS.md files (false positive secret warnings)
- Note in AGENTS.md headers: "CLAUDE.md is a symlink to this file for backward compatibility"

### Testing

- Verified symlinks work correctly with `head` command
- Confirmed Claude can read symlinks transparently
- AGENTS.md files follow the open standard format

## Benefits

1. **Vendor-neutral:** Works with GitHub Copilot, Cursor, Windsurf, Cody, and other AGENTS.md-compatible tools
2. **Standards-compliant:** Follows emerging open standard with 60k+ repository adoption
3. **Comprehensive:** Documents all key patterns, conventions, and pitfalls
4. **Backward compatible:** Claude Code continues to work via symlinks
5. **Monorepo-aware:** Nested AGENTS.md files provide workspace-specific context
6. **Future-proof:** Can add package-level AGENTS.md files as needed

## References

- [GitHub - agentsmd/agents.md](https://github.com/agentsmd/agents.md)
- [How to write a great agents.md - GitHub Blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [AGENTS.md Emerges as Open Standard - InfoQ](https://www.infoq.com/news/2025/08/agents-md/)

## Files Created/Modified

**Created:**
- `/AGENTS.md` (224 lines)
- `/frontend/AGENTS.md` (484 lines)
- `/server/AGENTS.md` (742 lines)
- `/frontend/CLAUDE.md` (symlink)
- `/docs/plans/2026-01-26-agents-md-configuration-design.md` (this file)

**Modified:**
- `/CLAUDE.md` (converted to symlink)
- `/server/CLAUDE.md` (converted to symlink)
- `/.talismanrc` (added AGENTS.md checksums)

**Total changes:** 1,457 insertions, 160 deletions
