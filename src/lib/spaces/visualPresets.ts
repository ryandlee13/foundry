export interface VisualPreset {
  id: string;
  label: string;
  accent: [string, string];
  icon: string;
}

/**
 * Stand-in for photo upload — there's no storage backend behind this
 * prototype, so venue operators pick a visual style instead of uploading
 * files that would go nowhere. Same gradient-placeholder approach as the
 * seed venues in src/lib/spaces/venues.ts.
 */
export const VENUE_VISUAL_PRESETS: VisualPreset[] = [
  { id: "neon", label: "Neon nightlife", accent: ["#ff2fb0", "#2fd3ff"], icon: "🎛️" },
  { id: "lounge", label: "Warm lounge", accent: ["#c0142f", "#e0a63a"], icon: "🏮" },
  { id: "midnight", label: "Midnight listening room", accent: ["#2b1055", "#7597de"], icon: "🎧" },
  { id: "waterfront", label: "Waterfront light", accent: ["#1c3f5f", "#8fb8d9"], icon: "🌉" },
  { id: "garden", label: "Garden green", accent: ["#3c5a3e", "#c9d9a8"], icon: "🌿" },
  { id: "skyline", label: "Golden-hour skyline", accent: ["#ff7a45", "#2b3a67"], icon: "🌆" },
  { id: "gallery", label: "Gallery white", accent: ["#111111", "#e63946"], icon: "🖼️" },
  { id: "studio", label: "Studio minimal", accent: ["#e9e6df", "#b9b2a3"], icon: "📷" },
];

export function getVisualPreset(id: string): VisualPreset {
  return VENUE_VISUAL_PRESETS.find((preset) => preset.id === id) ?? VENUE_VISUAL_PRESETS[0];
}
