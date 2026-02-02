import posthog from 'posthog-js';

let isInitialized = false;

export function initPostHog(apiKey: string) {
  if (isInitialized || typeof window === 'undefined') return;

  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: false,
    enable_heatmaps: true,
    persistence: 'localStorage+cookie',
    capture_performance: true,
  });

  // Set device properties
  posthog.register({
    device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
    viewport_width: window.innerWidth,
  });

  isInitialized = true;
}

// Era timing tracking
const eraTimings: Record<string, number> = {};
let currentEra: string | null = null;
let eraStartTime: number | null = null;

// Track scroll milestones (only fire once per session)
const firedMilestones = new Set<number>();

export function trackEraChange(newEra: string, scrollProgress: number): void {
  if (newEra === currentEra) return;

  // Track exit from previous era
  if (currentEra && eraStartTime) {
    const timeSpent = (Date.now() - eraStartTime) / 1000;
    eraTimings[currentEra] = (eraTimings[currentEra] || 0) + timeSpent;

    posthog.capture('era_exited', {
      era_name: currentEra,
      time_spent_seconds: Math.round(timeSpent * 10) / 10,
      total_time_in_era: Math.round(eraTimings[currentEra] * 10) / 10,
    });
  }

  // Track entry to new era
  posthog.capture('era_entered', {
    era_name: newEra,
    scroll_depth: Math.round(scrollProgress * 100),
  });

  currentEra = newEra;
  eraStartTime = Date.now();
}

export function trackScrollMilestone(scrollProgress: number): void {
  const milestones = [25, 50, 75, 100];
  const currentPercent = Math.round(scrollProgress * 100);

  for (const milestone of milestones) {
    if (currentPercent >= milestone && !firedMilestones.has(milestone)) {
      firedMilestones.add(milestone);
      posthog.capture('scroll_milestone', {
        milestone_percent: milestone,
        actual_percent: currentPercent,
      });
    }
  }
}

// Terminal easter egg tracking
export function trackTerminalCommand(command: string, isEasterEgg: boolean): void {
  posthog.capture('terminal_command', {
    command: command,
    is_easter_egg: isEasterEgg,
  });
}

export function trackEasterEggFound(id: string, context?: Record<string, unknown>): void {
  posthog.capture('easter_egg_found', {
    easter_egg_id: id,
    ...context,
  });
}

export function trackTerminalTabHint(completedTo: string): void {
  posthog.capture('terminal_tab_hint', {
    completed_to: completedTo,
  });
}

// Command palette tracking
export function trackCommandPaletteOpened(currentEra: string): void {
  posthog.capture('command_palette_opened', {
    current_era: currentEra,
  });
}

export function trackCommandPaletteUsed(commandId: string, searchQuery: string): void {
  posthog.capture('command_palette_used', {
    command_id: commandId,
    search_query: searchQuery,
  });
}

// Winamp player tracking
export function trackWinampControl(action: 'play' | 'pause' | 'stop', trackIndex: number): void {
  posthog.capture('winamp_control', {
    action: action,
    track_index: trackIndex,
  });
}

export function trackWinampTrackChange(fromIndex: number, toIndex: number): void {
  posthog.capture('winamp_track_change', {
    from_track: fromIndex,
    to_track: toIndex,
  });
}

export function trackWinampInteraction(type: 'volume' | 'seek', value: number): void {
  posthog.capture('winamp_interaction', {
    interaction_type: type,
    value: Math.round(value * 100) / 100,
  });
}

export { posthog };
