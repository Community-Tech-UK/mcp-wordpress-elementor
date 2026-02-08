export interface FeatureFlags {
  /** Core WordPress tools (posts, pages, media, users, comments, plugins). Always on. */
  wordpress: boolean;
  /** Elementor page-building tools (data, sections, widgets, elements, structure). */
  elementor: boolean;
  /** CommunityTech plugin integration (global colors, fonts, theme style, kit settings). */
  elementor_global_settings: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    wordpress: true,
    elementor: envBool('DISABLE_ELEMENTOR') ? false : true,
    elementor_global_settings: envBool('DISABLE_ELEMENTOR_GLOBAL_SETTINGS')
      ? false
      : true,
  };
}

function envBool(key: string): boolean {
  return process.env[key]?.toLowerCase() === 'true';
}
