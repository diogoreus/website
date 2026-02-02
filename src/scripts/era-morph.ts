import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { trackEraChange, trackScrollMilestone } from './analytics';

gsap.registerPlugin(ScrollTrigger);

// Era color configurations with expanded properties
interface EraColors {
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  border: string;
  borderRadius: string;
  glowIntensity: number;
  glowColor: string;
  // Additional morphing properties
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  headingWeight: number;
  letterSpacing: string;
}

const eras: Record<string, EraColors> = {
  hero: {
    bg: '#0a0a0a',
    bgSecondary: '#141414',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    accent: '#ffffff',
    accentSecondary: '#888888',
    border: '#333333',
    borderRadius: '12px',
    glowIntensity: 0,
    glowColor: 'rgba(255, 255, 255, 0.2)',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    headingWeight: 700,
    letterSpacing: '-0.02em',
  },
  flash: {
    bg: '#1a0a2e',
    bgSecondary: '#2d1b4e',
    text: '#ffffff',
    textSecondary: '#b8a8d4',
    accent: '#00ffff',
    accentSecondary: '#ff00ff',
    border: 'rgba(0, 255, 255, 0.3)',
    borderRadius: '20px',
    glowIntensity: 1,
    glowColor: 'rgba(0, 255, 255, 0.4)',
    fontHeading: 'Inter',
    fontBody: 'Verdana',
    fontMono: 'JetBrains Mono',
    headingWeight: 800,
    letterSpacing: '0.02em',
  },
  developer: {
    bg: '#0d1117',
    bgSecondary: '#161b22',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
    accent: '#58a6ff',
    accentSecondary: '#3fb950',
    border: '#30363d',
    borderRadius: '6px',
    glowIntensity: 0.3,
    glowColor: 'rgba(88, 166, 255, 0.2)',
    fontHeading: 'JetBrains Mono',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    headingWeight: 600,
    letterSpacing: '0',
  },
  executive: {
    bg: '#000000',
    bgSecondary: '#0a0a0a',
    text: '#ededed',
    textSecondary: '#888888',
    accent: '#0070f3',
    accentSecondary: '#7928ca',
    border: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    glowIntensity: 0.5,
    glowColor: 'rgba(0, 112, 243, 0.15)',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    headingWeight: 700,
    letterSpacing: '-0.03em',
  },
  ai: {
    bg: '#030303',
    bgSecondary: '#0a0a0f',
    text: '#f0f0f0',
    textSecondary: '#707080',
    accent: '#a855f7',
    accentSecondary: '#22d3ee',
    border: 'rgba(168, 85, 247, 0.2)',
    borderRadius: '16px',
    glowIntensity: 0.8,
    glowColor: 'rgba(168, 85, 247, 0.3)',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    headingWeight: 600,
    letterSpacing: '-0.01em',
  },
};

// Parse color to RGB components
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

// Interpolate between two colors
function interpolateColor(color1: string, color2: string, progress: number): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);
  const a = c1.a + (c2.a - c1.a) * progress;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Interpolate border radius
function interpolateBorderRadius(br1: string, br2: string, progress: number): string {
  const v1 = parseInt(br1);
  const v2 = parseInt(br2);
  return `${Math.round(v1 + (v2 - v1) * progress)}px`;
}

// Interpolate numeric values
function interpolateNumber(n1: number, n2: number, progress: number): number {
  return n1 + (n2 - n1) * progress;
}

// Apply era styles to CSS custom properties
function applyEraStyles(fromEra: string, toEra: string, progress: number): void {
  const from = eras[fromEra];
  const to = eras[toEra];

  if (!from || !to) return;

  const root = document.documentElement;

  root.style.setProperty('--era-bg', interpolateColor(from.bg, to.bg, progress));
  root.style.setProperty('--era-bg-secondary', interpolateColor(from.bgSecondary, to.bgSecondary, progress));
  root.style.setProperty('--era-text', interpolateColor(from.text, to.text, progress));
  root.style.setProperty('--era-text-secondary', interpolateColor(from.textSecondary, to.textSecondary, progress));
  root.style.setProperty('--era-accent', interpolateColor(from.accent, to.accent, progress));
  root.style.setProperty('--era-accent-secondary', interpolateColor(from.accentSecondary, to.accentSecondary, progress));
  root.style.setProperty('--era-border', interpolateColor(from.border, to.border, progress));
  root.style.setProperty('--era-border-radius', interpolateBorderRadius(from.borderRadius, to.borderRadius, progress));
  root.style.setProperty('--era-glow-intensity', String(interpolateNumber(from.glowIntensity, to.glowIntensity, progress)));
  root.style.setProperty('--era-glow-color', interpolateColor(from.glowColor, to.glowColor, progress));
}

// Determine current era based on scroll position
function getCurrentEraInfo(scrollProgress: number): { from: string; to: string; localProgress: number } {
  // Define era boundaries (0-1 range of total scroll)
  const boundaries = [
    { era: 'hero', start: 0, end: 0.1 },
    { era: 'flash', start: 0.1, end: 0.3 },
    { era: 'developer', start: 0.3, end: 0.5 },
    { era: 'executive', start: 0.5, end: 0.75 },
    { era: 'ai', start: 0.75, end: 1 },
  ];

  // Find which transition we're in
  for (let i = 0; i < boundaries.length - 1; i++) {
    const current = boundaries[i];
    const next = boundaries[i + 1];

    // Calculate transition zone (last 30% of current era overlapping with first 30% of next)
    const transitionStart = current.end - (current.end - current.start) * 0.3;
    const transitionEnd = next.start + (next.end - next.start) * 0.3;

    if (scrollProgress >= transitionStart && scrollProgress <= transitionEnd) {
      const transitionProgress = (scrollProgress - transitionStart) / (transitionEnd - transitionStart);
      return {
        from: current.era,
        to: next.era,
        localProgress: Math.min(1, Math.max(0, transitionProgress)),
      };
    }
  }

  // If not in transition, we're fully in an era
  for (const boundary of boundaries) {
    if (scrollProgress >= boundary.start && scrollProgress <= boundary.end) {
      return {
        from: boundary.era,
        to: boundary.era,
        localProgress: 1,
      };
    }
  }

  // Default to last era
  return { from: 'ai', to: 'ai', localProgress: 1 };
}

// Get current era name for morph attribute
function getCurrentEraName(scrollProgress: number): string {
  if (scrollProgress < 0.1) return 'hero';
  if (scrollProgress < 0.3) return 'flash';
  if (scrollProgress < 0.5) return 'developer';
  if (scrollProgress < 0.75) return 'executive';
  return 'ai';
}

// Initialization guard to prevent multiple initializations
let isInitialized = false;

// Initialize continuous morphing system
export function initEraMorph(): void {
  if (isInitialized) return;
  isInitialized = true;
  // Get total document height for scroll progress calculation
  const getScrollProgress = (): number => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;
  };

  // Throttled scroll handler using requestAnimationFrame
  let ticking = false;

  // Track previous era for analytics
  let previousEra: string | null = null;

  const updateMorph = () => {
    const scrollProgress = getScrollProgress();
    const { from, to, localProgress } = getCurrentEraInfo(scrollProgress);

    // Apply color morphing
    applyEraStyles(from, to, localProgress);

    // Update morph era attribute for CSS-driven morphing
    const currentEra = getCurrentEraName(scrollProgress);
    document.documentElement.setAttribute('data-morph-era', currentEra);

    // Track era changes for analytics
    if (currentEra !== previousEra) {
      trackEraChange(currentEra, scrollProgress);
      previousEra = currentEra;
    }

    // Track scroll milestones
    trackScrollMilestone(scrollProgress);

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateMorph);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial update
  updateMorph();

  // Also update on resize
  window.addEventListener('resize', () => {
    requestAnimationFrame(updateMorph);
  }, { passive: true });

  // Scroll-triggered animations for content elements
  gsap.utils.toArray<HTMLElement>('.era-section').forEach((section) => {
    const animateElements = section.querySelectorAll('.animate-in');

    if (animateElements.length > 0) {
      gsap.from(animateElements, {
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }
  });

  // Create scroll progress indicator (optional)
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        (progressBar as HTMLElement).style.transform = `scaleX(${self.progress})`;
      },
    });
  }

  // Stagger animations for cards and other repeated elements
  gsap.utils.toArray<HTMLElement>('.stagger-in').forEach((container) => {
    const items = container.children;

    gsap.from(items, {
      scrollTrigger: {
        trigger: container,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
      },
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out',
    });
  });

  // Refresh ScrollTrigger after all content loads (images, fonts, etc.)
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });

  // Refresh ScrollTrigger after resize (debounced)
  let resizeTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);
  });

  // Refresh after React components hydrate (double rAF ensures layout is stable)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  });
}

// Export for use in components
export { eras, applyEraStyles, getCurrentEraInfo, getCurrentEraName };
