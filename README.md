# BitGlow

### Secure Real-Time Social Communication Platform

BitGlow is a privacy-focused, real-time social communication platform designed around **identity, privacy, controlled access, and real-time interaction**.

The project is being built from the ground up with security and reliability as core engineering principles rather than as an afterthought.

🌐 **Live:** https://bitglow.site
💻 **Repository:** https://github.com/bitglovv/bitglow

---

## Overview

BitGlow explores a different approach to social communication by combining:

* Real-time social interaction
* Presence-first communication
* Follow and friend relationships
* Private messaging
* Live conversations
* Identity and profile controls
* Database-level authorization
* Security-focused backend architecture

The goal is to build a modern social communication platform where users can interact in real time while access to information and communication remains explicitly controlled.

BitGlow is also a practical security engineering project, applying web application security concepts to a real-world full-stack application.

---

## Core Features

### Authentication & Identity

* User registration and login
* Secure password handling
* JWT-based authentication
* Access and refresh token architecture
* Session management
* Email verification
* Account recovery workflows
* Account deletion and lifecycle controls
* Authentication-aware protected routes

### Social Layer

* User profiles
* Follow system
* Follow requests
* Mutual-follow relationships
* Friend relationships
* Privacy-aware profile access
* User discovery and search
* Notifications

### Real-Time Communication

* Real-time live communication
* Real-time presence
* Online user indicators
* Live message delivery
* Owner-based live rooms
* WebSocket communication
* Private 1-to-1 messaging
* Conversation requests
* Real-time message updates

### Content

* User posts
* Post interactions
* Social feed functionality
* Profile-based content
* Controlled visibility and access

### Privacy & Account Controls

* Private accounts
* Follow-request workflows
* Profile visibility controls
* Session/security settings
* Account recovery
* Secure account deletion workflows

---

## Security Engineering

Security is one of the primary goals of BitGlow.

The application has been developed with a security-first approach across the frontend, backend, API, database, authentication, and real-time communication layers.

Security-focused areas include:

* Authentication and authorization
* JWT security
* Session management
* Password hashing
* Protected API routes
* Input validation
* Request validation
* SSRF protection
* Rate limiting
* Abuse protection
* Security headers
* CORS configuration
* PostgreSQL security
* Supabase Row Level Security (RLS)
* Database access control
* WebSocket authorization
* WebSocket payload limits
* Database statement timeouts
* Database connection timeouts
* Security event logging
* Account recovery protection
* Secure account deletion
* Production security auditing

The repository also contains dedicated security audit and hardening scripts and database migrations used during the project's security engineering process.

---

## Technology Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **React Router**
* **Zustand**
* **Socket.IO Client**
* **Lucide React**
* **Sentry**

### Backend

* **Node.js**
* **TypeScript**
* **Fastify**
* **WebSockets**
* **PostgreSQL**
* **Supabase**
* **JWT**
* **bcrypt**
* **Fastify Helmet**
* **Fastify CORS**
* **Fastify Rate Limit**
* **Fastify Multipart**
* **Sentry**
* **Resend**

### Infrastructure

* **Vercel** — frontend hosting
* **Render** — backend hosting
* **Supabase / PostgreSQL** — database and storage services

---

## Architecture

BitGlow is organized as a full-stack application with separate frontend and backend layers.

```text
                         ┌──────────────────────┐
                         │      BitGlow Web     │
                         │   React + TypeScript │
                         │      Vite + Tailwind │
                         └──────────┬───────────┘
                                    │
                         HTTPS / API / WebSocket
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    BitGlow Backend   │
                         │ Node.js + Fastify     │
                         │      TypeScript       │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
       │ PostgreSQL / │     │  WebSocket   │     │   Supabase   │
       │   Supabase   │     │   Layer      │     │   Services   │
       └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Repository Structure

```text
bitglow/
│
├── bitglow-frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── config/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── bitglow-backend/
│   ├── db/
│   │   ├── schema.sql
│   │   ├── live-chat-schema.sql
│   │   ├── dm-schema.sql
│   │   └── migrations/
│   │
│   ├── scripts/
│   │   ├── audit-live-messages.ts
│   │   ├── audit-security.ts
│   │   └── database utilities
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── plugins/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   ├── types/
│   │   ├── ws/
│   │   └── server.ts
│   │
│   ├── .env.example
│   └── package.json
│
├── DEVELOPMENT_PLAN.md
├── IMPROVEMENTS.md
├── TODO.md
├── package.json
├── package-lock.json
└── .gitignore
```

---

## Frontend Architecture

The frontend is built as a modular React application.

Major areas include:

```text
src/
├── app/
├── components/
├── hooks/
├── layouts/
├── pages/
├── services/
├── store/
├── types/
└── utils/
```

State management is handled through Zustand stores, while API and real-time communication are separated into dedicated service layers.

The application uses responsive layouts designed for both desktop and mobile experiences.

---

## Backend Architecture

The backend uses Fastify with TypeScript.

```text
src/
├── config/
├── plugins/
├── routes/
├── services/
├── types/
├── ws/
└── server.ts
```

### Routes

Backend route modules cover areas including:

* Authentication
* Direct messages
* Live communication
* Notifications
* Posts
* Profiles
* Settings
* Validation schemas

### Plugins

Security and infrastructure plugins include functionality for:

* Authentication
* CORS
* Security headers
* Rate limiting
* Request handling

### WebSocket Layer

The WebSocket layer handles real-time communication including:

* Live room communication
* Presence
* Real-time messaging
* Connection management
* Payload limits
* Authorization-aware communication

---

## Database

BitGlow uses **PostgreSQL** with Supabase services.

Database functionality includes areas such as:

* Users
* Authentication/session data
* Profiles
* Posts
* Follow relationships
* Follow requests
* Notifications
* Direct conversations
* Direct messages
* Live rooms
* Live messages
* Account lifecycle data
* Security-related data

Database migrations are maintained under:

```text
bitglow-backend/db/
```

The project uses PostgreSQL authorization controls and Supabase Row Level Security where appropriate.

---

## Local Development

### Requirements

Before running BitGlow locally, install:

* Node.js
* npm
* PostgreSQL or access to a PostgreSQL/Supabase database
* Git

---

## Clone the Repository

```bash
git clone https://github.com/bitglovv/bitglow.git
cd bitglow
```

---

## Backend Setup

```bash
cd bitglow-backend
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables in `.env`.

At minimum, the backend requires configuration for:

```env
DATABASE_URL=
JWT_SECRET=
CORS_ORIGINS=
APP_URL=
```

Additional services such as email and Supabase storage require their corresponding environment variables.

**Never commit `.env` or production secrets to Git.**

Start the backend in development mode:

```bash
npm run dev
```

The default local backend configuration uses port `3003`.

---

## Frontend Setup

Open another terminal:

```bash
cd bitglow-frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend normally runs at:

```text
http://localhost:5173
```

Configure the frontend environment variables required by the current deployment configuration before connecting it to the backend.

---

## Production Builds

### Frontend

```bash
cd bitglow-frontend
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Backend

```bash
cd bitglow-backend
npm run build
```

Type-check the backend:

```bash
npm run typecheck
```

Start the compiled backend:

```bash
npm start
```

---

## Security Auditing

BitGlow includes dedicated backend auditing scripts.

### Security audit

```bash
cd bitglow-backend
npm run audit:security
```

### Live message audit

```bash
npm run audit:live-messages
```

These tools are part of the project's ongoing security and reliability verification process.

---

## Environment Variables

Environment variables are intentionally excluded from source control.

The backend provides:

```text
bitglow-backend/.env.example
```

Important configuration areas include:

* Database connection
* JWT signing secret
* CORS origins
* Application URL
* Email provider
* Supabase configuration
* Token lifetimes
* Database timeouts
* Live-message TTL
* WebSocket payload limits
* PostgreSQL TLS configuration
* Proxy configuration
* Security event logging

### Production Security

Production deployments should use strong, unique secrets and secure TLS configuration.

Never expose:

```text
DATABASE_URL
JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

or other private credentials in source control, client-side environment variables, screenshots, logs, or public documentation.

---

## Deployment

The intended deployment architecture is:

```text
                    ┌────────────────────┐
                    │      Vercel        │
                    │     Frontend       │
                    └─────────┬──────────┘
                              │
                              │ HTTPS / API
                              ▼
                    ┌────────────────────┐
                    │      Render        │
                    │      Backend       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │      Supabase      │
                    │ PostgreSQL / Data  │
                    └────────────────────┘
```

Production deployments should configure environment variables through the hosting provider rather than committing deployment secrets to the repository.

---

## Security Principles

BitGlow follows several core security principles:

### Least Privilege

Users and services should receive only the access required for their intended operation.

### Defense in Depth

Security controls are applied across multiple layers:

```text
Client
  ↓
Authentication
  ↓
Authorization
  ↓
API validation
  ↓
Application logic
  ↓
Database authorization
  ↓
Data
```

### Secure Defaults

Security-sensitive functionality should default toward restrictive behavior rather than broad access.

### Server-Side Enforcement

Security decisions must not rely solely on frontend checks.

The backend and database are responsible for enforcing authorization boundaries.

### Secrets Management

Sensitive credentials belong in environment configuration or managed secret stores, never in source control.

---

## Privacy

BitGlow is designed with privacy and controlled visibility in mind.

Privacy-related functionality includes:

* Private accounts
* Follow requests
* Controlled profile visibility
* Relationship-aware access
* Private messaging
* Session controls
* Account recovery
* Account deletion

The application should always treat user-generated data and authentication information as sensitive.

---

## Project Status

**Status: Actively developed / approaching production release**

BitGlow is currently deployed as a live application while final production security, reliability, and operational verification continue.

The project is continuously evolving as security findings, usability issues, and production requirements are identified and addressed.

---

## Roadmap

Planned and continuing areas of development include:

* Continued security hardening
* Production reliability improvements
* Performance optimization
* Real-time infrastructure improvements
* Privacy enhancements
* Account lifecycle improvements
* Monitoring and observability
* UX refinement
* Additional security testing
* Documentation improvements

The repository's development documents contain additional project planning and improvement information.

---

## Documentation

Additional project documentation is available in the repository:

* `DEVELOPMENT_PLAN.md`
* `IMPROVEMENTS.md`
* `TODO.md`

Database schemas and migrations are maintained under:

```text
bitglow-backend/db/
```

---

## Contributing

BitGlow is currently maintained as an independent project.

If you discover a security vulnerability, avoid publicly exposing sensitive exploit details before the issue can be responsibly assessed.

For general improvements, bug reports, and suggestions, GitHub Issues can be used where appropriate.

---

## Responsible Security Disclosure

If you discover a security vulnerability in BitGlow, please report it responsibly.

Do not publish:

* Authentication bypass details
* Credentials or secrets
* Private user information
* Database access details
* Exploit code targeting the live service
* Sensitive production infrastructure information

Security reports should contain enough information to reproduce and understand the issue without unnecessarily exposing sensitive data.

---

## License

No open-source license is currently specified for this repository.

Unless a license is added, the source code should not be assumed to be freely reusable, redistributed, or modified outside the permissions granted by the repository owner.

---

## Acknowledgements

BitGlow is an independent full-stack and cybersecurity engineering project created to explore the design, development, deployment, and security hardening of a real-time social communication platform.

---

## Links

🌐 **Live Application:** https://bitglow.site

💻 **GitHub Repository:** https://github.com/bitglovv/bitglow

---

### BitGlow

**Where Every Bits Glow.**

Built with a focus on real-time communication, privacy, identity protection, and secure software engineering.
