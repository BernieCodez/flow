# Flow

Flow is a checkpoint-driven writing workspace for high-school and college students. It brings topic planning, source collection, annotation, drafting, citations, export, and project deadlines into one focused application.

## Local development

1. Copy `.env.example` to `.env.local` and configure PostgreSQL and OAuth credentials.
2. Install dependencies with `pnpm install`.
3. Run `pnpm prisma generate` and `pnpm prisma db push`.
4. Start Flow with `pnpm dev`.

Without OAuth credentials, the UI can still be previewed through the development demo session.
