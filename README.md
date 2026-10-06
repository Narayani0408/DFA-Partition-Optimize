# DFA Partition Optimizer
**Interactive Hopcroft Algorithm Lab** — minimize a DFA and watch every partition split.

## Features
Hopcroft's DFA minimization (with unreachable-state removal) · interactive SVG DFA graph with pan/pinch/zoom · step trace (splitter, symbol, predecessor set X, splits) · partition and worklist visualization · state mapping · verification checklist · generated Web Audio sound effects (volume, algorithm/UI toggles, saved in localStorage) · mobile tabs + bottom control bar · JSON import, full JSON export, CSV export · light/dark theme · reduced-motion support.

## Run Locally
```bash
npm install
npm run dev
```
## Build
```bash
npm run build
npm run preview
```
## Phone testing on your Wi-Fi
`localhost:5173` on your laptop is **not** reachable from a phone. Run
```bash
npm run dev -- --host 0.0.0.0
```
and open the printed network URL (e.g. `http://192.168.x.x:5173`) on a phone on the **same Wi-Fi**. For easy phone access, deploy instead.

## GitHub Pages (automatic)
Live site: **https://narayani0408.github.io/DFA-Partition-Optimizer/**
Every push to `main` runs `.github/workflows/deploy.yml` (npm ci → npm run build → deploy `dist`). One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. (If Pages is set to "Deploy from a branch", GitHub serves the *source* `index.html` and the app stays blank.) The production base path is `/DFA-Partition-Optimizer/`; `npm run dev` still uses `/`.

## Deploy (Vercel)
Set the env var `VITE_BASE=/` in the Vercel project (the default base is the GitHub Pages path).
1. Push this folder to GitHub. 2. In Vercel: **Add New → Project →** import the repo. 3. Framework preset *Vite* (auto-detected; build `npm run build`, output `dist`). 4. Deploy. `vercel.json` handles SPA rewrites. Asset paths are relative (`base: './'`), so GitHub Pages and Netlify also work without changes.

## Algorithm
`src/algorithm.ts` is UI-independent: `validateDFA`, `findReachable`, `minimize` (Hopcroft + trace), `verify`. All visuals read that trace.
