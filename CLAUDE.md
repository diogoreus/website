# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website showcasing a 15+ year career journey through four distinct visual "eras" that morph continuously as the user scrolls. Built with Astro, React, Tailwind CSS v4, and GSAP.

## Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build production site to ./dist/
npm run preview  # Preview production build locally
```

## Architecture

### Era Morphing System

The site's core feature is scroll-driven visual transformations between career eras. Each era has a unique design language that smoothly interpolates to the next.

**Era definitions** in `src/scripts/era-morph.ts`:
- `hero` (0-10% scroll) - Neutral entry point
- `flash` (10-30%) - 2010s Flash era: neon colors, glows, bold typography
- `developer` (30-50%) - IDE aesthetic: GitHub dark theme, monospace fonts
- `executive` (50-75%) - Modern SaaS: Linear/shadcn style, subtle gradients
- `ai` (75-100%) - Experimental: particle systems, purple/cyan accents

The system uses CSS custom properties (`--era-*`) that update in real-time, allowing any component to respond to scroll position.

### Component Organization

```
src/components/
├── eras/           # Full-page era sections (FlashEra, DeveloperEra, etc.)
├── flash/          # Flash-era specific: GlossyCard, WinampPlayer, RadialNav
├── developer/      # IDE components: Terminal, CodeBlock, FileExplorer
├── executive/      # Business components: BentoCard, AnimatedCounter
├── ai/             # Experimental: ParticleText, ParticleCanvas (React), NodeNav
├── morphing/       # Cross-era: MorphingNav, MorphingButton
└── transitions/    # GlitchTransition effects
```

### Key Technical Details

- **Tailwind CSS v4** is configured via Vite plugin (`@tailwindcss/vite`), not PostCSS
- **React components** (`.tsx`) are used for complex client-side interactivity (e.g., Three.js particle canvas)
- **GSAP ScrollTrigger** handles scroll-based animations; elements with `.animate-in` or `.stagger-in` classes auto-animate
- Era sections use `.era-section` class for scroll-triggered content animations

## Content

The site documents Diogo Reus's career: Flash Developer → Full-Stack Developer → CGO at Mobiliza → Senior AI Technical PM at AE Studio. Bio content is in `docs/bio.md`.
