# BitGlow Engineering Audit & Improvements

This document provides a comprehensive audit of the BitGlow workspace. It identifies key issues across the stack and recommends specific, actionable improvements to bring the platform to a production-quality standard.

---

## 1. Architecture

### Issue: Monolith Without Clear Boundaries
- **Severity**: `Medium`
- **Explanation**: The backend is a classic monolith. While acceptable for an early-stage project, it lacks clear internal boundaries (e.g., domain-driven modules). As the application grows, this will lead to tightly coupled code, making it difficult to maintain and scale specific features independently.
- **Recommended Solution**:
    1.  Logically separate code into domain-focused modules (e.g., `users`, `posts`, `messaging`).
    2.  Establish clear interfaces between these modules to enforce separation of concerns.
    3.  Adopt a "ports and adapters" (hexagonal) architecture to decouple business logic from external concerns like the database and API framework.
- **Estimated Complexity**: `High`
- **Files Affected**: Entire backend folder structure (`bitglow-backend/src`).

---

## 2. Backend

### Issue: Inconsistent Error Handling
- **Severity**: `High`
- **Explanation**: The `server.ts` file previously contained two conflicting `setErrorHandler` calls. While this was fixed, a more robust, centralized error handling strategy is needed. Standardized error codes and messages should be used across the entire API.
- **Recommended Solution**: Create a dedicated error-handling module that exports custom error classes (e.g., `NotFoundError`, `ValidationError`) and a single, comprehensive Fastify error handler that maps these errors to appropriate HTTP responses.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/src/server.ts`, `bitglow-backend/src/routes/*.ts`.

### Issue: Lack of a Service Layer
- **Severity**: `Medium`
- **Explanation**: Business logic is currently mixed within Fastify route handlers in `auth.ts`. This makes the logic difficult to test, reuse, and maintain.
- **Recommended Solution**: Abstract all business logic into a dedicated service layer. Route handlers should only be responsible for parsing requests, calling the appropriate service method, and formatting the response. For example, the logic for user signup should live in an `auth.service.ts` file.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/src/routes/*.ts`, and new `bitglow-backend/src/services/*.ts` files.

---

## 3. Frontend

### Issue: Components with Inline Business Logic
- **Severity**: `Medium`
- **Explanation**: The frontend lacks a clear separation between presentation components and business logic. This will lead to large, unmanageable components that are difficult to test and reuse.
- **Recommended Solution**:
    1.  Use custom hooks (`useAuth`, `useFeed`) to encapsulate business logic, API calls, and state management.
    2.  Keep components focused on rendering UI based on props and state.
    3.  Separate API client logic into its own module (e.g., `src/api/index.ts`).
- **Estimated Complexity**: `Medium`
- **Files Affected**: All future and existing components in `bitglow-frontend/src/components`.

### Issue: Inefficient State Management
- **Severity**: `Low`
- **Explanation**: While Zustand is a good choice, a clear strategy for managing global vs. local state is needed. Without one, the global store can become a dumping ground for all data, leading to unnecessary re-renders.
- **Recommended Solution**: Define a clear policy: use Zustand for global state (e.g., authenticated user) and React's `useState`/`useReducer` for local component state (e.g., form inputs).
- **Estimated Complexity**: `Low`
- **Files Affected**: All stateful components in `bitglow-frontend/src`.

---

## 4. Database & SQL Performance

### Issue: Missing Database Indices
- **Severity**: `High`
- **Explanation**: The `schema.sql` file defines tables but does not create indices on frequently queried columns, such as `users(email)`, `users(username)`, or foreign key columns. This will cause significant performance degradation as the tables grow.
- **Recommended Solution**: Audit all database queries and add indices to columns used in `WHERE` clauses, `JOIN` conditions, and `ORDER BY` clauses.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/db/schema.sql`.

### Issue: Potential for N+1 Queries
- **Severity**: `Medium`
- **Explanation**: The current data access patterns do not appear to use batching or eager loading. For example, fetching 10 posts and then fetching the author for each post would result in 11 separate queries (an N+1 problem).
- **Recommended Solution**: Use SQL `JOIN`s or a data loader pattern to fetch related data in a single, efficient query.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/src/services/db.ts` and any files with direct database queries.

---

## 5. Authentication & Authorization

### Issue: No Refresh Token Rotation
- **Severity**: `Critical`
- **Explanation**: The current authentication system issues long-lived refresh tokens without a rotation strategy. If a refresh token is stolen, an attacker can use it indefinitely to generate new access tokens.
- **Recommended Solution**: Implement refresh token rotation. When a refresh token is used, issue a new access token *and* a new refresh token, and invalidate the one that was just used.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/src/routes/auth.ts`, `bitglow-backend/src/services/security.ts`.

### Issue: No Two-Factor Authentication (2FA)
- **Severity**: `High`
- **Explanation**: The lack of 2FA is a major security gap, leaving user accounts vulnerable to password theft.
- **Recommended Solution**: Integrate a TOTP (Time-based One-Time Password) library to add a 2FA setup and verification flow.
- **Estimated Complexity**: `High`
- **Files Affected**: `bitglow-backend/src/routes/auth.ts`, `bitglow-backend/src/services/db.ts`, `bitglow-frontend/src/pages/Settings.tsx`.

### Issue: No Granular Authorization
- **Severity**: `Medium`
- **Explanation**: The system currently lacks a role-based or permission-based authorization system. There is no way to define what a "user" vs. an "admin" vs. a "moderator" can do.
- **Recommended Solution**: Implement a simple role-based access control (RBAC) system. Add a `role` column to the `users` table and create a Fastify middleware or plugin to check roles on protected routes.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `bitglow-backend/db/schema.sql`, `bitglow-backend/src/server.ts`, and all protected routes.

---

## 6. Code Quality & Consistency

### Issue: No Linter or Code Formatter
- **Severity**: `High`
- **Explanation**: The absence of tools like ESLint and Prettier results in inconsistent code style and allows common bugs to go undetected. This makes the codebase harder to read and maintain.
- **Recommended Solution**:
    1.  Install and configure ESLint with a strict ruleset (e.g., `eslint:recommended`, `plugin:@typescript-eslint/recommended`).
    2.  Install and configure Prettier to enforce a consistent code style.
    3.  Add `lint` and `format` scripts to `package.json`.
- **Estimated Complexity**: `Medium`
- **Files Affected**: All `.ts` and `.tsx` files in both projects. New configuration files (`.eslintrc.js`, `.prettierrc`).

### Issue: Widespread Use of `any`
- **Severity**: `High`
- **Explanation**: The backend codebase makes extensive use of `any`, which disables TypeScript's static type checking and hides potential bugs. This was partially addressed in `auth.ts` but needs to be fixed project-wide.
- **Recommended Solution**: Systematically replace every instance of `any` with specific types, interfaces, or generics. Enable ESLint rules to forbid the use of `any`.
- **Estimated Complexity**: `High`
- **Files Affected**: Nearly all TypeScript files in `bitglow-backend`.

### Issue: Duplicated Code
- **Severity**: `Medium`
- **Explanation**: The user object construction logic is duplicated in the `/login` and `/restore-account` routes in `auth.ts`. This violates the DRY (Don't Repeat Yourself) principle.
- **Recommended Solution**: Create a centralized helper function, such as `buildUserResponse(dbUser)`, to construct the user object and reuse it in all relevant routes.
- **Estimated Complexity**: `Low`
- **Files Affected**: `bitglow-backend/src/routes/auth.ts`.

---

## 7. Testing & CI/CD

### Issue: No Automated Tests
- **Severity**: `Critical`
- **Explanation**: The complete absence of a testing suite (unit, integration, e2e) is the single biggest risk to the project. Every change is a potential breaking change, and there is no safety net to catch regressions.
- **Recommended Solution**:
    1.  Introduce `Vitest` as the testing framework for both frontend and backend.
    2.  Write unit tests for all services and utilities.
    3.  Write integration tests for API endpoints.
    4.  Write basic component tests for the frontend.
- **Estimated Complexity**: `High`
- **Files Affected**: New `*.test.ts` and `*.test.tsx` files across both projects.

### Issue: No CI/CD Pipeline
- **Severity**: `Critical`
- **Explanation**: There is no automated process for running tests, linting, or building the project. This manual process is error-prone and slow.
- **Recommended Solution**: Create a GitHub Actions workflow (`.github/workflows/ci.yml`) that triggers on every push and pull request. The workflow should install dependencies, run linting, execute the test suite, and perform a production build.
- **Estimated Complexity**: `Medium`
- **Files Affected**: New `.github/workflows/ci.yml` file.

---

## 8. Scalability & Performance

### Issue: WebSocket Implementation Does Not Scale
- **Severity**: `High`
- **Explanation**: The current `ws` implementation stores session data in memory. This will not work in a multi-instance, load-balanced environment, as a user's subsequent requests could be routed to a different server that doesn't have their session information.
- **Recommended Solution**: Use a backplane like Redis Pub/Sub to broadcast messages between all server instances, ensuring all users receive real-time updates regardless of which server they are connected to.
- **Estimated Complexity**: `High`
- **Files Affected**: `bitglow-backend/src/services/ws.ts`.

### Issue: No API Pagination
- **Severity**: `High`
- **Explanation**: Endpoints that will return lists of data (e.g., posts, followers, messages) do not support pagination. Fetching thousands of items will crash the server or the client.
- **Recommended Solution**: Implement cursor-based or offset-based pagination on all list endpoints.
- **Estimated Complexity**: `Medium`
- **Files Affected**: All future list-based routes and their corresponding database queries.

---

## 9. Configuration & Build

### Issue: Broken `typecheck` Script
- **Severity**: `High`
- **Explanation**: The environment configuration causes the `npm run typecheck` command to fail with irrelevant errors, effectively hiding real type errors. This negates many of the benefits of using TypeScript.
- **Recommended Solution**: Debug the PowerShell environment path issues or find an alternative way to execute the `tsc` command that produces clean output. This is a prerequisite for enforcing strict type safety.
- **Estimated Complexity**: `Medium`
- **Files Affected**: `package.json`, potentially system environment variables.

### Issue: Missing Production Build Optimizations
- **Severity**: `Medium`
- **Explanation**: The Vite and TSC build configurations are basic. They lack optimizations like code splitting, tree shaking, and minification that are essential for a fast production application.
- **Recommended Solution**: Review and enhance the `vite.config.ts` and `tsconfig.json` files to ensure all production optimization flags are enabled.
- **Estimated Complexity**: `Low`
- **Files Affected**: `bitglow-frontend/vite.config.ts`, `bitglow-backend/tsconfig.json`.