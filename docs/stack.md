Here’s a solid “best-practice” tech stack for a **Node.js + Express** project in 2026 terms—optimized for reliability, maintainability, and production operations. I’ll give you a default stack that fits most teams, plus swap options.

## Baseline stack (recommended for most Express APIs)

### Runtime & framework

* **Node.js LTS** (always)
* **Express** (with a thin routing layer, not business logic in controllers)

### Language

* **TypeScript** (strongly recommended)

  * Better refactoring, fewer runtime bugs, easier onboarding.

### Project structure

* Layered architecture (simple and scalable):

  * `routes/` (HTTP wiring)
  * `controllers/` (request/response mapping only)
  * `services/` (business logic)
  * `repositories/` (DB access)
  * `models/` or `domain/`
  * `middlewares/` (auth, validation, error handling)
  * `config/` (env, constants)

---

## Core production components

### Validation

* **Zod** (or Joi) for request/response validation

  * Use it at the boundary (incoming requests) and for config validation.

### Auth

* If you own auth: **JWT (access) + refresh tokens**
* If enterprise: **OIDC/OAuth2** via an IdP (Okta, Azure AD, Cognito)
* Use **Passport** only if you really need its strategy ecosystem.

### Database & ORM

Pick based on your DB:

**Postgres (most common choice)**

* ORM: **Prisma** (fast dev + type safety)
  or **TypeORM** (more traditional)
  or **Drizzle** (leaner, SQL-ish)

**MongoDB**

* **Mongoose** (still the standard), or use Mongo driver + Zod

### Migrations

* Prisma migrations / TypeORM migrations / Flyway (if DB-centric team)

### Caching / queues

* **Redis** for caching, rate limiting, sessions, distributed locks
* Background jobs:

  * **BullMQ** (Redis-backed jobs) for internal async tasks
  * If event-driven infra: Kafka/RabbitMQ depending on org

### Logging & observability

* Logging: **Pino** (fast structured logging)
* Request logging: **pino-http**
* Tracing/metrics: **OpenTelemetry**
* Error reporting: **Sentry**
* Health checks: `/health`, `/ready` endpoints

### Security best practices

* **Helmet** (HTTP headers)
* **CORS** configured tightly
* **Rate limiting** (Redis-backed if multiple instances)
* **Input validation everywhere**
* Secrets: env vars + vault (AWS Secrets Manager / Azure Key Vault / Vault)

### API documentation

* **OpenAPI (Swagger)**

  * Generate from code or define spec-first
  * Keep it in CI to prevent drift

---

## Dev experience & code quality

### Tooling

* Formatting: **Prettier**
* Linting: **ESLint** (TypeScript rules)
* Git hooks: **Husky + lint-staged**
* Tests:

  * Unit/integration: **Jest** or **Vitest**
  * API integration: **Supertest**
  * Contract tests (optional): **Pact**

### Config management

* **dotenv** for local
* Validate config at startup using **Zod** (fail fast)

---

## Deployment & ops (modern defaults)

### Containerization

* **Docker** (multi-stage builds)
* Run with **non-root** user
* Use **distroless** or slim base images if possible

### CI/CD

* GitHub Actions / GitLab CI / Azure DevOps
* Pipeline stages:

  * lint → test → build → security scan → deploy

### Hosting patterns

* Containers on **Kubernetes** or ECS
* Or simpler: **Render/Fly/Heroku-like** platforms

---

## “If you want the simplest proven stack”

If you want a one-line “best default” for most Express APIs:

**Node LTS + Express + TypeScript + Zod + Prisma (Postgres) + Redis + BullMQ + Pino + OpenTelemetry + Jest/Vitest + Docker + OpenAPI + Sentry**

---

## Quick decision questions (so you can tailor it)

If you answer these, I’ll recommend the exact combo (with folder structure and packages):

1. Postgres or MongoDB (or something else)?
2. Need background jobs / scheduled tasks?
3. Auth type: JWT-only or OIDC with enterprise SSO?
4. Deployment: Kubernetes/ECS vs simple platform?

If you don’t want to answer, tell me “assume Postgres + JWT + Docker”, and I’ll give you a ready-to-run scaffold layout + package list.
