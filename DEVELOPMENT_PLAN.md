# BitGlow Development Plan

This document outlines the strategic development plan for the BitGlow platform, including an analysis of the current architecture and a phased roadmap for future work.

## 1. Current State Analysis

### 1.1. Architecture Summary

-   **Backend**: A monolithic application built with **Node.js**, **Fastify**, and **TypeScript**. It handles API requests, authentication, and WebSocket communication.
-   **Frontend**: A single-page application (SPA) built with **React**, **Vite**, and **TypeScript**. State management is handled by **Zustand**, and styling is done with **TailwindCSS**.
-   **Database**: A **PostgreSQL** database, managed via **Supabase**, serves as the primary data store.
-   **Communication**: The frontend and backend communicate via a **RESTful API** for most data operations and **WebSockets** for real-time features.
-   **Authentication**: Implemented using **JWTs** (JSON Web Tokens) with an access/refresh token pattern. Passwords are securely hashed using **bcrypt**.

### 1.2. Existing Features

-   User account creation (signup) with email verification.
-   User login and logout.
-   Secure password reset functionality.
-   Account restoration flow for deactivated accounts.
-   Basic API rate limiting.
-   Security logging for critical events like login failures and password resets.

### 1.3. Missing Features

-   Core social features: feed, posts, likes, comments, follows.
-   Real-time messaging features: typing indicators, read receipts, online status.
-   User profiles and settings pages.
-   Media uploads and sharing.
-   Two-Factor Authentication (2FA/TOTP).
-   Refresh token rotation.
-   Admin panel for user management and content moderation.

### 1.4. Technical Debt

-   **Inconsistent Typing**: Widespread use of `any` throughout the backend, which undermines TypeScript's benefits (partially addressed).
-   **Duplicated Code**: Repetitive logic, especially in the creation of user response objects within authentication routes.
-   **Lack of Automated Testing**: No unit, integration, or end-to-end tests are present, making refactoring and new feature development risky.
-   **Configuration Issues**: The development environment has issues that prevent `npm run typecheck` from executing cleanly, hiding potential type errors.

### 1.5. Security Issues

-   **No Refresh Token Rotation**: Compromised refresh tokens can be used indefinitely to generate new access tokens.
-   **Missing 2FA**: The absence of a second authentication factor makes accounts vulnerable to password theft.
-   **Insufficient Input Validation**: While some routes have schemas, validation is not consistently applied across the entire API surface.

### 1.6. Performance Issues

-   **No Caching**: The backend does not use a caching layer (like Redis), leading to unnecessary database queries for frequently accessed data.
-   **No Pagination**: API endpoints that return lists of data do not implement pagination, which will lead to slow responses and high memory usage as data grows.
-   **Potential N+1 Queries**: The current database access patterns may be inefficient and could lead to performance degradation.

### 1.7. Code Quality Issues

-   **No Linter or Formatter**: The lack of automated code style enforcement leads to inconsistent formatting and potential code quality issues.
-   **Inconsistent Error Handling**: The backend has multiple, sometimes conflicting, error handlers (partially addressed).
-   **Poorly Organized Files**: The project structure could be improved for better separation of concerns (e.g., a dedicated `types` directory).

### 1.8. Scalability Concerns

-   **Single-Instance Architecture**: The backend is not designed to run in a multi-instance, load-balanced environment.
-   **WebSocket Scaling**: The current WebSocket implementation will not work across multiple server instances without a backplane (e.g., Redis Pub/Sub).
-   **Database Bottlenecks**: Without proper indexing and query optimization, the database will become a performance bottleneck.

---

## 2. Development Roadmap

This roadmap is divided into five phases, designed to address the issues above and build BitGlow into a robust, scalable, and feature-rich platform.

### Phase 1 - Stabilization

*Focus: Shore up the foundation, improve code quality, and establish automated guardrails.*

| Task                                                                 | Priority   |
| -------------------------------------------------------------------- | ---------- |
| Configure and enforce linting and code formatting (ESLint, Prettier) | `Critical` |
| Establish a testing framework (e.g., Vitest) for backend and frontend | `Critical` |
| Resolve environment issues preventing `npm run typecheck` from running | `Critical` |
| Refactor duplicated helper functions and centralize common logic     | `High`     |
| Complete the replacement of all `any` types with strict interfaces   | `High`     |
| Standardize and improve validation across all API endpoints          | `High`     |

### Phase 2 - Feature Completion

*Focus: Implement core features required for a minimum viable product (MVP).*

| Task                                                                 | Priority   |
| -------------------------------------------------------------------- | ---------- |
| Implement refresh token rotation for enhanced security               | `Critical` |
| Implement Two-Factor Authentication (2FA/TOTP)                       | `High`     |
| Build the social feed API and frontend components (posts, likes)     | `High`     |
| Build user profile pages (view and edit)                             | `High`     |
| Implement basic direct messaging functionality                       | `Medium`   |

### Phase 3 - UX Improvements

*Focus: Enhance the user experience with modern, real-time features.*

| Task                                                                 | Priority   |
| -------------------------------------------------------------------- | ---------- |
| Implement advanced feed features (infinite scroll, skeleton loaders) | `High`     |
| Create a fully responsive design for mobile and desktop              | `High`     |
| Add advanced messaging features (typing indicators, read receipts)   | `Medium`   |
| Implement image and media sharing capabilities                       | `Medium`   |
| Add support for emoji reactions                                      | `Low`      |

### Phase 4 - Performance

*Focus: Optimize the application to ensure it is fast and responsive under load.*

| Task                                                                 | Priority   |
| -------------------------------------------------------------------- | ---------- |
| Implement pagination for all list-based API endpoints                | `High`     |
| Audit and optimize critical SQL queries and add necessary indexes    | `High`     |
| Audit and optimize frontend bundle size and React rendering          | `High`     |
| Implement a caching strategy (e.g., Redis) for hot data paths        | `Medium`   |

### Phase 5 - Production Readiness

*Focus: Prepare the platform for a scalable, secure, and maintainable production deployment.*

| Task                                                                 | Priority   |
| -------------------------------------------------------------------- | ---------- |
| Set up a CI/CD pipeline for automated testing and deployment         | `Critical` |
| Conduct a comprehensive security audit and penetration test          | `Critical` |
| Enhance security logging, monitoring, and alerting                   | `High`     |
| Prepare for multi-instance deployment (load balancing, WS scaling)   | `Medium`   |
| Generate comprehensive API and component documentation               | `Medium`   |