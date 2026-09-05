# BitGlow Identity Phase 1 Architecture

## Scope

This Phase 1 implementation introduces a minimal identity foundation for an authenticated BitGlow user. It does not implement zero-knowledge proof flows, credential issuance, selective disclosure, or external verification.

## Data model

The repository uses PostgreSQL and Fastify. Phase 1 adds two tables:

- `identities`
  - `id`
  - `user_id` (one-to-one with the existing `users` table)
  - `status`
  - `created_at`
  - `updated_at`
- `identity_attributes`
  - `id`
  - `identity_id`
  - `attribute_type`
  - `attribute_value`
  - `verification_status`
  - `source`
  - `created_at`
  - `updated_at`

The identity is tied directly to the authenticated BitGlow user via `user_id`, and each attribute row belongs to exactly one identity. This keeps the foundation bounded and avoids duplicating personal data.

## Security and authorization

- All identity routes use the existing `requireAuth` Fastify middleware.
- The backend uses `req.auth.id` instead of trusting client-provided user IDs.
- The identity records and attribute rows are scoped to the authenticated user.
- The route validation schema rejects unexpected payload keys.
- Only the `active` status is supported in Phase 1 to keep the lifecycle minimal and safe.

## Backend API

- `GET /api/identity` or `GET /api/identity/me` returns the current user's identity
- `POST /api/identity` creates the identity if it does not exist
- `PUT /api/identity` updates the status for the authenticated user
- `GET /api/identity/attributes` returns the current user's attribute set

The API automatically initializes default identity attributes for:

- `bitglow_account`
- `email_verified`
- `student`
- `college_member`

`email_verified` reflects the existing BitGlow user record and is intentionally kept distinct from external proof or credential issuance.

## Frontend

The frontend adds a protected `/identity` route and a page that displays:

- identity status
- available attributes
- verification status labels without claiming external proof

The page handles loading, empty, unauthenticated, and error states.

## Notes

This phase intentionally excludes:

- selective disclosure
- proof generation
- QR verification
- credential issuance
- revocation / expiry
- external issuer integrations
- blockchain or decentralized identity components
