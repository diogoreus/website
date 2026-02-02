# Diogo Reus - Portfolio Website

A personal portfolio showcasing a 15+ year career journey through four distinct visual "eras" that morph continuously as you scroll. Each era has a unique design language that smoothly interpolates to the next, creating an immersive storytelling experience.

**[Live Site](https://diogoreus.me/)**

## The Era Morphing System

The site's standout feature is scroll-driven visual transformations between career phases:

| Era | Scroll Range | Visual Language |
|-----|--------------|-----------------|
| **Flash** (2010-2012) | 10-30% | Neon colors, glows, bold typography, Winamp player |
| **Developer** (2012-2017) | 30-50% | IDE aesthetic, GitHub dark theme, monospace fonts |
| **Executive** (2017-2024) | 50-75% | Modern SaaS style (Linear/shadcn), subtle gradients |
| **AI** (2025+) | 75-100% | Particle systems, purple/cyan accents, experimental |

The system uses CSS custom properties (`--era-*`) that update in real-time via GSAP ScrollTrigger, allowing any component to respond to scroll position.

## Tech Stack

- **[Astro](https://astro.build/)** - Static site generation with islands architecture
- **[React 19](https://react.dev/)** - Interactive components (Three.js particle canvas, Winamp player)
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first styling via Vite plugin
- **[GSAP](https://gsap.com/)** - Scroll-triggered animations and era morphing
- **[Three.js](https://threejs.org/)** - WebGL particle effects in AI era

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Development server runs at `http://localhost:4321`

## Project Structure

```
src/
├── components/
│   ├── eras/           # Full-page era sections
│   ├── flash/          # Flash-era: GlossyCard, WinampPlayer, RadialNav
│   ├── developer/      # IDE components: Terminal, CodeBlock, FileExplorer
│   ├── executive/      # Business: BentoCard, AnimatedCounter, CommandPalette
│   ├── ai/             # Experimental: ParticleText, ParticleCanvas (React)
│   ├── morphing/       # Cross-era: MorphingNav, MorphingButton
│   └── transitions/    # GlitchTransition effects
├── scripts/
│   └── era-morph.ts    # Core morphing system with CSS variable interpolation
├── layouts/
│   └── Layout.astro    # Base layout with analytics
└── pages/
    └── index.astro     # Main entry point
```

## Author

**Diogo Reus** - Designer, Developer, Executive, AI Builder

- [LinkedIn](https://linkedin.com/in/diogoreus)
- [GitHub](https://github.com/diogoreus)

## License

MIT License - see [LICENSE](./LICENSE) for details.
