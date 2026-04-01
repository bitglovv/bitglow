# 🧠 BitGlow — AI Working Rules

This document defines **how AI assistants must work on BitGlow**.
It exists to keep the codebase **clean, scalable, and professional**.

---

## 🏗️ CORE PRINCIPLE

> **Stabilize structure first → scale features safely**

Structure is law.  
Features must adapt to structure, never the other way around.

---

## 📁 PROJECT STRUCTURE (FINAL & FROZEN)

Frontend (`bitglow-frontend/src`):

- `pages/` — Route-level pages ONLY (no layout logic)
- `layouts/` — Page shells (AuthLayout, AppLayout)
- `components/` — Reusable UI only
- `hooks/` — React logic only
- `services/` — API & WebSocket clients
- `store/` — Global state
- `styles/` — Global CSS (Tailwind)

Backend (`bitglow-backend/src`):

- `routes/` — REST APIs
- `ws/` — WebSocket logic
- `services/` — Business logic
- `middleware/` — Guards & validation
- `db/` — Persistence

❌ Do not move files unless explicitly requested  
❌ Do not mix responsibilities

---

## 🎨 UI & DESIGN RULES

BitGlow must always look:

- Clean
- Modern
- Calm
- Premium
- Mobile-first

Rules:
- Tailwind CSS only
- Dark mode first
- Constrained widths (`max-w-*`)
- Consistent spacing (`space-y-*`, `gap-*`)
- Rounded corners (`rounded-xl`, `rounded-2xl`)
- No raw HTML styling

❌ No ugly boxes  
❌ No full-width stretched forms  
❌ No random margins or colors  

---

## 🧭 ROUTING & PREVIEW MODEL

- BitGlow is a **Single Page Application**
- Only one real HTML file (`index.html`)
- Pages are React `.tsx` components
- Pages are previewed via routes:
  - `/login`
  - `/signup`
  - `/live`
  - `/profile`
  - `/settings`

❌ Never suggest `.html` or `.php` pages  
❌ Never open `.tsx` directly in browser  

---

## 🔐 AUTH & LOGIC RULES

- Backend is the authority
- Frontend is UI only
- No permission logic in frontend
- WebSockets must be React-18-safe
- Identity must come from explicit server events

❌ No hacks  
❌ No disabling StrictMode  

---

## 🧩 FEATURE DEVELOPMENT RULE

Only one feature per task.

Before coding:
- Which feature?
- Which files?
- What must NOT change?

---

## 🧠 FINAL NOTE

> You are not building pages.  
> You are building **a living application system**.

BitGlow should always feel:
- Alive
- Human
- Intentional
- Structured
