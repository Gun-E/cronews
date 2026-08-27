# CRONEWS v2 architecture

CRONEWS is deployed as one full-stack Next.js application on Vercel. Scheduled ingestion and generation are split into idempotent workflow steps rather than executed in one Cron request.

## Decisions

- Gemini 2.5 Flash is the primary generation provider.
- Groq Qwen 3.6 27B is the fallback provider.
- The application depends on the internal `LlmProvider` interface, not a vendor SDK.
- RSS/Atom/Sitemap ingestion, deduplication, clustering, crossword placement and scoring are deterministic TypeScript code.
- LLM calls are limited to keyword selection, question, hint and explanation generation.
- PostgreSQL is the initial source of truth for content, workflow state, sessions, points and rankings.
- A failed automated edition remains in review state; it must never publish malformed or unsupported content.

## Privacy

Only public article metadata and feed summaries may be sent to free-tier providers. User data, credentials and private administrator notes must not be included in prompts.
