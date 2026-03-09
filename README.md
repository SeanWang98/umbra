# Umbra

A starter template for building web apps with **ClojureScript** and modern frontend tooling. Umbra wires together shadow-cljs, Vite, Tailwind CSS v4, and shadcn/ui so you get a fully working setup — hot reloading, utility-first styling, and a rich component library — out of the box.

## Tech Stack

| Layer | Tool | Role |
|-------|------|------|
| Language | [ClojureScript](https://clojurescript.org/) via [shadow-cljs](https://github.com/thheller/shadow-cljs) | ESM output with external JS provider |
| React | [UIx](https://github.com/pitch-io/uix) (React 19) | Idiomatic ClojureScript React wrapper |
| Bundler | [Vite 8](https://vite.dev/) | Dev server, CSS pipeline, production build |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS with `@tailwindcss/vite` plugin |
| Components | [shadcn/ui](https://ui.shadcn.com/) | Headless React components (TSX) |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) | System / light / dark mode |
| Toasts | [Sonner](https://sonner.emilkowal.dev/) | Toast notifications |

## Prerequisites

- **Node.js** >= 24
- **Java** >= 21 (OpenJDK recommended)
- **[Bun](https://bun.sh/)** (or npm — swap `bun` for `npm` in the commands below)

## Quick Start

```bash
# Install dependencies
bun install

# Development — run these in two separate terminals:
bun run shadow-cljs   # Terminal 1: compile ClojureScript (shadow-cljs watch)
bun run dev           # Terminal 2: start Vite dev server

# Production build
bun run build

# Preview production build
bun run preview
```

Open [http://localhost:5173](http://localhost:5173) in your browser during development.

## Project Structure

```
umbra/
├── index.html                  # App entry point — loads compiled CLJS modules
├── shadow-cljs.edn             # shadow-cljs config (ESM target, external JS provider)
├── vite.config.js              # Vite config (Tailwind plugin, path aliases, build rewrites)
├── components.json             # shadcn/ui config
├── deps.edn                    # Clojure dependencies
├── package.json                # Node dependencies and scripts
├── public/                     # Static assets (copied to dist/ on build)
└── src/
    ├── app/
    │   ├── core.cljs           # App entry — UIx components, root renderer, HMR handler
    │   └── core.css            # Tailwind CSS imports and design tokens
    ├── dev/
    │   └── cljs-hmr-guard.js   # Vite plugin: coordinates CLJS and CSS hot reloading
    └── js/
        ├── components/ui/      # shadcn/ui components (TSX) — button, card, sonner, etc.
        └── lib/utils.ts        # cn() utility (clsx + tailwind-merge)
```

## How HMR Works

Umbra runs two HMR systems in parallel:

- **JS HMR** — shadow-cljs handles ClojureScript changes through its own WebSocket connection. UIx components marked with `^:dev/after-load` re-render automatically.
- **CSS HMR** — Vite handles Tailwind CSS updates via its native HMR.

The challenge: when you edit a `.cljs` file, Tailwind detects the change (it scans `.cljs` files for class names) and tells Vite to do a full page reload — which conflicts with shadow-cljs.

The **`cljs-hmr-guard`** plugin (`src/dev/cljs-hmr-guard.js`) solves this by:

1. Intercepting Vite's `full-reload` events triggered by `.cljs` file changes
2. Converting them into CSS-only updates, so Tailwind re-extracts classes without reloading the page
3. Making `target/dev/external.js` (shadow-cljs's external dependency index) HMR-capable via lazy proxies and a `shadow-cljs:deps-ready` wake-up event

The result: edit a `.cljs` file and both your code and CSS update instantly without a page refresh.

## Adding shadcn Components

```bash
bunx shadcn@latest add <component-name>
```

Components are installed to `src/js/components/ui/` as TSX files. Use them from ClojureScript via standard JS interop:

```clojure
(ns app.core
  (:require ["@/components/ui/button" :refer [Button]]
            [uix.core :refer [defui $]]))

(defui my-component []
  ($ Button {:variant "outline" :on-click #(js/alert "Clicked!")}
     "Click me"))
```

The `@/` alias resolves to `src/js/`, matching shadcn's default import convention.

## Build Pipeline

### Development

1. `shadow-cljs watch` compiles ClojureScript to `target/dev/` (ESM modules)
2. Vite serves `index.html`, which loads `target/dev/external.js` and `target/dev/main.js`
3. Tailwind scans `.cljs` files for class names and generates CSS on the fly

### Production

1. `shadow-cljs release` compiles optimized ClojureScript to `target/release/`
2. Vite builds the app — the path alias automatically rewrites `target/dev/` to `target/release/`
3. Output goes to `dist/`, ready to deploy

Both steps run sequentially via `bun run build`.

## Dark Mode

Dark mode is powered by [next-themes](https://github.com/pacocoursey/next-themes) with the `class` strategy, which works seamlessly with Tailwind CSS v4's dark mode. The theme defaults to the system preference.

The `ThemeProvider` is set up in `src/app/core.cljs` — wrap your root component with it to enable theming across the app.

## Using as a Template

Click **"Use this template"** on GitHub, or scaffold locally with [degit](https://github.com/Rich-Harris/degit):

```bash
bun add -g degit
degit SeanWang98/umbra my-app
cd my-app
bun install
```

Then update `index.html`, `package.json`, and `src/app/core.cljs` with your app's details.

## License

[MIT](LICENSE.md)
