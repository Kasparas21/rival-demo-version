# Tribal

The **Next.js application** lives in **`hero-repro/`**. That folder is the product (dashboard, ads library, competitor flows, etc.).

## Local development

From **`hero-repro/`**:

```bash
cd hero-repro && npm install && npm run dev
```

From the **repository root** (installs `hero-repro` via `postinstall`):

```bash
npm install
npm run dev
```

## Deploying (Vercel)

**Required:** set the Vercel project **Root Directory** to **`hero-repro`**.

1. Open your project on Vercel → **Settings** → **Build & Deployment**.
2. Under **Root Directory**, set **`hero-repro`** (not the repository root) and save.
3. Use the default **Next.js** install command (`npm install` or `npm ci` inside that folder) and build (`npm run build`). Leave **Output Directory** empty for Next.js.
4. Copy environment variables from **`hero-repro/.env.local.example`** into the project’s **Environment Variables** (see that file for names).

If you deploy from the **repository root** instead, keep **Output Directory** empty (do **not** set it to `public`). The repo includes **`vercel.json`** with **`"framework": "nextjs"`**, root **`package.json`** lists **`next`** for detection, and after **`next build`** a **symlink** **`./.next` → `hero-repro/.next`** so Vercel finds the output at the repo root **without** copying (copying breaks traced `node_modules` paths).

Deploying with the **Git repository root** as the Vercel root is not supported for this layout: Next output and **node_modules** tracing must live in the same directory as the app.

## What is not the app

- **`archive/crush-hero-prototype.html`** — old static “Crush hero” HTML experiment. It is **not** opened by the Next app.

## Repository layout

| Path | Purpose |
|------|---------|
| `hero-repro/` | Next.js app — **run and deploy this** |
| `archive/` | Archived static prototypes |
