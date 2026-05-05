# AGENTS.md

## Overview

GitHub Action that reviews Laravel migration files in pull requests. It extracts SQL queries via a dry run of migrations in `php artisan tinker`, optionally reviews them with OpenAI GPT for safety issues, and posts findings as PR comments.

## Build and Test

```bash
npm run build
npm run lint
npm test
```

After any source change, run `npm run build` to regenerate `dist/index.js` — this is the actual entry point used by the GitHub Action runtime (`action.yml` → `runs.main`).

## Architecture

- [src/index.ts](src/index.ts) — Entry point. Orchestrates: fetch changed files → filter migrations → extract SQL → review → post comment.
- [src/github.ts](src/github.ts) — GitHub API wrapper (list PR files, manage comments). Comments are identified by `<!-- laravel-migrations-check -->` header.
- [src/reviewer.ts](src/reviewer.ts) — OpenAI integration. Sends migrations to LLM with JSON schema output. Uses SHA-256 hash of (instructions + context + input) to skip redundant reviews.
- [src/types.d.ts](src/types.d.ts) — `Migration` interface shared across modules.
