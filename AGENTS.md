# ECC — Agent Instructions

This is a **production-ready AI coding plugin** providing 72 specialized agents, 328 skills, 99 commands, and automated hook workflows for software development.

**Version:** 2.2.3

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **Test-Driven** — Write tests before implementation, 80%+ coverage required
3. **Security-First** — Never compromise on security; validate all inputs
4. **Immutability** — Always create new objects, never mutate existing ones
5. **Plan Before Execute** — Plan complex features before writing code

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| bengali-reviewer | Bengali text review | Unicode, normalization, grapheme, search, and locale correctness |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| spec-miner | Brownfield spec extraction | Onboarding brownfield projects to spec-driven development |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | End-to-end Playwright testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| cpp-reviewer | C/C++ code review | C and C++ projects |
| cpp-build-resolver | C/C++ build errors | C and C++ build failures |
| fsharp-reviewer | F# functional code review | F# projects |
| docs-lookup | Documentation lookup via Context7 | API/docs questions |
| go-reviewer | Go code review | Go projects |
| go-build-resolver | Go build errors | Go build failures |
| kotlin-reviewer | Kotlin code review | Kotlin/Android/KMP projects |
| kotlin-build-resolver | Kotlin/Gradle build errors | Kotlin build failures |
| database-reviewer | PostgreSQL/Supabase specialist | Schema design, query optimization |
| python-reviewer | Python code review | Python projects |
| django-reviewer | Django code review | Django apps, DRF APIs, ORM, migrations |
| django-build-resolver | Django build, migration, and setup errors | Django startup, dependency, migration, collectstatic failures |
| java-reviewer | Java and Spring Boot code review | Java/Spring Boot projects |
| java-build-resolver | Java/Maven/Gradle build errors | Java build failures |
| loop-operator | Autonomous loop execution | Run loops safely, monitor stalls, intervene |
| harness-optimizer | Harness config tuning | Reliability, cost, throughput |
| rust-reviewer | Rust code review | Rust projects |
| rust-build-resolver | Rust build errors | Rust build failures |
| gdscript-reviewer | GDScript and Godot 4 code review | Godot projects |
| pytorch-build-resolver | PyTorch runtime/CUDA/training errors | PyTorch build/training failures |
| mle-reviewer | Production ML pipeline review | ML pipelines, evals, serving, monitoring, rollback |
| rag-pipeline-reviewer | RAG pipeline review | Retrieval quality, chunking, reranking, RAGAS evaluation coverage |
| typescript-reviewer | TypeScript/JavaScript code review | TypeScript/JavaScript projects |
| react-reviewer | React/JSX code review | React component and hook changes |
| react-build-resolver | React/Vite/Next.js/webpack build errors | React build failures |
| vue-reviewer | Vue.js Composition API and reactivity review | Vue component, Pinia, and Nuxt changes |
| swift-reviewer | Swift/iOS code review | Swift code changes |
| swift-build-resolver | Swift/Xcode/SPM build errors | Swift build failures |
| flutter-reviewer | Flutter/Dart widget and state review | Flutter app changes |
| dart-build-resolver | Dart/Flutter build and pub dependency errors | Flutter compilation failures |
| csharp-reviewer | C#/.NET async patterns, nullability, security | All C# code changes |
| fastapi-reviewer | FastAPI async correctness, Pydantic, OpenAPI | FastAPI endpoint and schema changes |
| php-reviewer | PHP/PSR-12, Eloquent, security review | PHP code changes |
| harmonyos-app-resolver | HarmonyOS ArkTS/ArkUI code and API review | HarmonyOS/OpenHarmony application changes |
| healthcare-reviewer | Clinical safety, PHI compliance, CDSS accuracy | Healthcare, EMR/EHR application code |
| a11y-architect | WCAG 2.2 accessibility architecture | Designing UI components, accessibility audits |
| code-architect | Feature architecture blueprints from codebase patterns | New features needing implementation design |
| network-architect | Enterprise multi-site network architecture | Complex network design decisions |
| homelab-architect | Home/small-lab network design | Home infrastructure planning |
| network-config-reviewer | Router/switch config security and correctness | Network configuration changes |
| network-troubleshooter | OSI-layer connectivity and routing diagnosis | Network connectivity and routing issues |
| performance-optimizer | Bottleneck detection, bundle size, memory leaks | Slow code or high resource usage |
| silent-failure-hunter | Swallowed errors and missing propagation | Code reliability audits |
| type-design-analyzer | Type encapsulation and invariant design | Type design and invariant reviews |
| pr-test-analyzer | PR test coverage quality and completeness | Before merging pull requests |
| code-explorer | Execution path tracing and architecture mapping | Understanding unfamiliar code paths |
| code-simplifier | Clarity-focused code refinement without behavior change | Post-implementation cleanup |
| comment-analyzer | Comment accuracy, freshness, and rot risk | Code comment audits |
| agent-evaluator | 5-axis quality scoring for agent output | Evaluating task completion quality |
| chief-of-staff | Multi-channel communication triage and drafting | Managing email/Slack communication workflows |
| conversation-analyzer | Extract hook behaviors from session transcripts | Creating hooks from observed patterns |
| marketing-agent | Campaign planning, copy creation, content calendars | Product launches, marketing campaigns |
| seo-specialist | Technical SEO audit, structured data, Core Web Vitals | Site audits, meta tag and schema issues |
| opensource-forker | Fork projects and strip secrets for open-sourcing | Starting an open-source release |
| opensource-sanitizer | Verify sanitized fork is release-ready | Before any public release |
| opensource-packager | Generate OSS packaging boilerplate (README, LICENSE, etc.) | Finalizing an open-source release |
| gan-planner | Expand a prompt into a full product specification | Starting a GAN harness session |
| gan-generator | Implement features per spec, iterate on evaluator feedback | GAN harness implementation phase |
| gan-evaluator | Test running application via Playwright and score it | GAN harness evaluation phase |

## Agent Orchestration

Use agents proactively without user prompt:
- Complex feature requests → **ecc:planner**
- Code just written/modified → **ecc:code-reviewer**
- Bug fix or new feature → **ecc:tdd-guide**
- Architectural decision → **ecc:architect**
- Security-sensitive code → **ecc:security-reviewer**
- Brownfield project onboarding → **ecc:spec-miner**
- Autonomous loops / loop monitoring → **ecc:loop-operator**
- Harness config reliability and cost → **ecc:harness-optimizer**
- RAG/retrieval pipeline changes → **ecc:rag-pipeline-reviewer**
- Performance bottleneck or slow code → **ecc:performance-optimizer**
- React/JSX changes → **ecc:react-reviewer**
- Vue changes → **ecc:vue-reviewer**
- Swift changes → **ecc:swift-reviewer**
- C# changes → **ecc:csharp-reviewer**
- PHP changes → **ecc:php-reviewer**
- Flutter/Dart changes → **ecc:flutter-reviewer**
- Healthcare/clinical code → **ecc:healthcare-reviewer**
- UI component design → **ecc:a11y-architect**
- Open-source release prep → **ecc:opensource-forker** → **ecc:opensource-sanitizer** → **ecc:opensource-packager**
- Agent output quality check → **ecc:agent-evaluator**

Use parallel execution for independent operations — launch multiple agents simultaneously.

## Security Guidelines

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection enabled
- Authentication/authorization verified
- Rate limiting on all endpoints
- Error messages don't leak sensitive data

**Secret management:** NEVER hardcode secrets. Use environment variables or a secret manager. Validate required secrets at startup. Rotate any exposed secrets immediately.

**If security issue found:** STOP → use security-reviewer agent → fix CRITICAL issues → rotate exposed secrets → review codebase for similar issues.

## Coding Style

**Immutability (CRITICAL):** Always create new objects, never mutate. Return new copies with changes applied.

**File organization:** Many small files over few large ones. 200-400 lines typical, 800 max. Organize by feature/domain, not by type. High cohesion, low coupling.

**Error handling:** Handle errors at every level. Provide user-friendly messages in UI code. Log detailed context server-side. Never silently swallow errors.

**Input validation:** Validate all user input at system boundaries. Use schema-based validation. Fail fast with clear messages. Never trust external data.

**Code quality checklist:**
- Functions small (<50 lines), files focused (<800 lines)
- No deep nesting (>4 levels)
- Proper error handling, no hardcoded values
- Readable, well-named identifiers

## Testing Requirements

**Minimum coverage: 80%**

Test types (all required):
1. **Unit tests** — Individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — Critical user flows

**TDD workflow (mandatory):**
1. Write test first (RED) — test should FAIL
2. Write minimal implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage 80%+

Troubleshoot failures: check test isolation → verify mocks → fix implementation (not tests, unless tests are wrong).

## Development Workflow

1. **Plan** — Use ecc:planner agent, identify dependencies and risks, break into phases
2. **TDD** — Use ecc:tdd-guide agent, write tests first, implement, refactor
3. **Review** — Use ecc:code-reviewer agent immediately, address CRITICAL/HIGH issues
4. **Capture knowledge in the right place**
   - Personal debugging notes, preferences, and temporary context → auto memory
   - Team/project knowledge (architecture decisions, API changes, runbooks) → the project's existing docs structure
   - If the current task already produces the relevant docs or code comments, do not duplicate the same information elsewhere
   - If there is no obvious project doc location, ask before creating a new top-level file
5. **Commit** — Conventional commits format, comprehensive PR summaries

## Workflow Surface Policy

- `skills/` is the canonical workflow surface.
- New workflow contributions should land in `skills/` first.
- `commands/` is a legacy slash-entry compatibility surface and should only be added or updated when a shim is still required for migration or cross-harness parity.

## Git Workflow

**Commit format:** `<type>: <description>` — Types: feat, fix, refactor, docs, test, chore, perf, ci

**PR workflow:** Analyze full commit history → draft comprehensive summary → include test plan → push with `-u` flag.

## Architecture Patterns

**API response format:** Consistent envelope with success indicator, data payload, error message, and pagination metadata.

**Repository pattern:** Encapsulate data access behind standard interface (findAll, findById, create, update, delete). Business logic depends on abstract interface, not storage mechanism.

**Skeleton projects:** Search for battle-tested templates, evaluate with parallel agents (security, extensibility, relevance), clone best match, iterate within proven structure.

## Performance

**Context management:** Avoid last 20% of context window for large refactoring and multi-file features. Lower-sensitivity tasks (single edits, docs, simple fixes) tolerate higher utilization.

**Build troubleshooting:** Use build-error-resolver agent → analyze errors → fix incrementally → verify after each fix.

## Project Structure

```
agents/          — 72 specialized subagents
skills/          — 328 workflow skills and domain knowledge
commands/        — 99 slash commands
hooks/           — Trigger-based automations
rules/           — Always-follow guidelines (common + per-language)
scripts/         — Cross-platform Node.js utilities
mcp-configs/     — 14 MCP server configurations
tests/           — Test suite
```

`commands/` remains in the repo for compatibility, but the long-term direction is skills-first.

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met

# ECC for Codex CLI

This supplements the root `AGENTS.md` with Codex-specific guidance.

For repo navigation, surface ownership, and PR diff packet guidance, read
`docs/CODEX-NAVIGATION-GUIDE.md` after this supplement.

For native cache dependency installation and Codex 0.164.0 executable-link
rejections, use the [runtime dependency procedure](../.codex-plugin/README.md#runtime-dependencies-and-codex-01640-cache-checks).

## Model Recommendations

| Task Type | Recommended Model |
|-----------|------------------|
| Routine coding, tests, formatting | GPT-6 Luna medium |
| Complex features, architecture | GPT-6 Sol high |
| Debugging, refactoring | GPT-6 Sol high |
| Security review | GPT-6 Sol high |

## Skills Discovery

Skills are auto-loaded from `.agents/skills/`. Each skill contains:
- `SKILL.md` — Detailed instructions and workflow
- `agents/openai.yaml` — Codex interface metadata

Available skills:
- tdd-workflow — Test-driven development with 80%+ coverage
- security-review — Comprehensive security checklist
- coding-standards — Universal coding standards
- frontend-patterns — React/Next.js patterns
- frontend-slides — Viewport-safe HTML presentations and PPTX-to-web conversion
- article-writing — Long-form writing from notes and voice references
- content-engine — Platform-native social content and repurposing
- market-research — Source-attributed market and competitor research
- investor-materials — Decks, memos, models, and one-pagers
- investor-outreach — Personalized investor outreach and follow-ups
- backend-patterns — API design, database, caching
- e2e-testing — Playwright E2E tests
- eval-harness — Eval-driven development
- strategic-compact — Context management
- api-design — REST API design patterns
- verification-loop — Build, test, lint, typecheck, security
- deep-research — Multi-source research with firecrawl and exa MCPs
- exa-search — Neural search via Exa MCP for web, code, and companies
- claude-api — Anthropic Claude API patterns and SDKs
- x-api — X/Twitter API integration for posting, threads, and analytics
- crosspost — Multi-platform content distribution
- fal-ai-media — AI image/video/audio generation via fal.ai
- dmux-workflows — Multi-agent orchestration with dmux

## MCP Servers

Treat the project-local `.codex/config.toml` as the default Codex baseline for ECC. The current ECC baseline enables GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking; add heavier extras in `~/.codex/config.toml` only when a task actually needs them.

ECC's canonical Codex section name is `[mcp_servers.context7]`. The launcher package remains `@upstash/context7-mcp`; only the TOML section name is normalized for consistency with `codex mcp list` and the reference config.

### Automatic config.toml merging

The sync script (`scripts/sync-ecc-to-codex.sh`) uses a Node-based TOML parser to safely merge ECC MCP servers into `~/.codex/config.toml`:

- **Add-only by default** — missing ECC servers are appended; existing servers are never modified or removed.
- **7 managed servers** — Supabase, Playwright, Context7, Exa, GitHub, Memory, Sequential Thinking.
- **Canonical naming** — ECC manages Context7 as `[mcp_servers.context7]`; legacy `[mcp_servers.context7-mcp]` entries are treated as aliases during updates.
- **Package-manager aware** — uses the project's configured package manager (npm/pnpm/yarn/bun) instead of hardcoding `pnpm`.
- **Drift warnings** — if an existing server's config differs from the ECC recommendation, the script logs a warning.
- **`--update-mcp`** — explicitly replaces all ECC-managed servers with the latest recommended config (safely removes subtables like `[mcp_servers.supabase.env]`).
- **User config is always preserved** — custom servers, args, env vars, and credentials outside ECC-managed sections are never touched.

## External Action Boundaries

Treat networked tools as read-only by default. Search, inspect, and draft freely within the user's requested scope, but require explicit user approval before posting, publishing, pushing, merging, opening paid jobs, dispatching remote agents, changing third-party resources, or modifying credentials.

When approval is ambiguous, produce a local plan or draft artifact instead of taking the external action. Preserve user config and private state unless the user specifically asks for a scoped change.

## Multi-Agent Support

Codex now supports multi-agent workflows behind the experimental `features.multi_agent` flag.

- Enable it in `.codex/config.toml` with `[features] multi_agent = true`
- Define project-local roles under `[agents.<name>]`
- Point each role at a TOML layer under `.codex/agents/`
- Use `/agent` inside Codex CLI to inspect and steer child agents

Sample role configs in this repo:
- `.codex/agents/explorer.toml` — read-only evidence gathering
- `.codex/agents/reviewer.toml` — correctness/security review
- `.codex/agents/docs-researcher.toml` — API and release-note verification

## Key Differences from Claude Code

| Feature | Claude Code | Codex CLI |
|---------|------------|-----------|
| Hooks | 8+ event types | Reviewed native subset with explicit trust in `/hooks` |
| Context file | CLAUDE.md + AGENTS.md | AGENTS.md only |
| Skills | Skills loaded via plugin | Native plugin skills and repo `.agents/skills/` |
| Commands | `/slash` commands | Instruction-based |
| Agents | Subagent Task tool | Multi-agent via `/agent` and `[agents.<name>]` roles |
| Security | Hook profiles + sandbox | Trusted hook subset + instruction + sandbox |
| MCP | Full support | Supported via `config.toml` and `codex mcp add` |

## Security with Narrower Hooks

Codex supports a narrower native hook subset than Claude Code, with explicit trust in `/hooks`. Treat those reviewed hooks as one layer alongside instructions and the sandbox:
1. Always validate inputs at system boundaries
2. Never hardcode secrets — use environment variables
3. Run `npm audit` / `pip audit` before committing
4. Review `git diff` before every push
5. Use `sandbox_mode = "workspace-write"` in config


## Marketplace Domain Guidelines (Plataforma Clientes, Profesionales y Espacios)

Este proyecto implementa la plataforma integral de conexión y reserva para bienestar, salud y entrenamiento personal, coordinando tres participantes principales: **Cliente**, **Profesional** y **Gestor de Espacio**.

### Reglas Clave del Negocio
1. **Disponibilidad y Geo-Routing**:
   - Radio máximo configurado por el profesional desde su ubicación base.
   - Tiempo de viaje estricto entre citas: `inicio candidato >= fin anterior + viaje(anterior -> candidato) + buffer`.
   - La agenda manda: nunca ofrecer huecos sin tiempo de viaje suficiente. La agenda privada nunca se expone al cliente.
2. **Checkout Único y Desglose en 4 Partidas**:
   - `Total = X (Servicio) + Z (Comisión Plataforma Servicio) + Y (Espacio) + W (Comisión Plataforma Espacio)`.
   - Si no hay sala, Y y W no aplican. Para cliente nuevo en gimnasio, primera entrada gratuita (`Y = 0`).
   - Confirmación automática con el pago (sin aprobación manual del profesional).
3. **Gestión de Concurrencia y Aforo**:
   - Bloqueo temporal de plazas/sala durante el checkout (10 min TTL) mediante bloqueos a nivel de fila (`SELECT ... FOR UPDATE`).
   - Aforo estricto para clases grupales con lista de espera no monetizada.

### Skills Especializadas para el Proyecto
- **Pagos & Comisiones:** `$connect-recommend`, `$stripe-best-practices`, `$stripe-webhooks`
- **Autenticación & Roles:** `$better-auth-best-practices`, `$better-auth-security-best-practices`, `$organization-best-practices`
- **Motor de Reservas & Disponibilidad:** `$marketplace-booking-engine`
- **Base de Datos & Concurrencia:** `$supabase-postgres-best-practices`, `$postgres-patterns`, `$database-migrations`
- **Notificaciones Transaccionales:** `$resend`, `$react-email`
- **Frontend & Diseño:** `$impeccable`, `$taste-skill`, `$ui-ux-pro-max`, `$design-system`, `$react-patterns`
