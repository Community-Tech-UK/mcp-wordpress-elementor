import { getFeatureFlags } from '../config/feature-flags.js';
import { hasMultiSiteConfig } from '../wordpress.js';

// WordPress CRUD tools
import { postsTools, postsHandlers } from './posts.js';
import { pagesTools, pagesHandlers } from './pages.js';
import { categoriesTools, categoriesHandlers } from './categories.js';
import { commentsTools, commentsHandlers } from './comments.js';
import { mediaTools, mediaHandlers } from './media.js';
import { usersTools, usersHandlers } from './users.js';
import { pluginsTools, pluginsHandlers } from './plugins.js';
import { pluginRepositoryTools, pluginRepositoryHandlers } from './plugin-repository.js';
import { menusTools, menusHandlers } from './menus.js';

// Elementor tools
import { elementorDataTools, elementorDataHandlers } from './elementor-data.js';
import { elementorStructureTools, elementorStructureHandlers } from './elementor-structure.js';
import { elementorSectionsTools, elementorSectionsHandlers } from './elementor-sections.js';
import { elementorElementsTools, elementorElementsHandlers } from './elementor-elements.js';
import { elementorWidgetsTools, elementorWidgetsHandlers } from './elementor-widgets.js';

// Elementor global settings (CommunityTech)
import { elementorGlobalSettingsTools, elementorGlobalSettingsHandlers } from './elementor-global-settings.js';

// SiteSEO (CommunityTech)
import { siteseoTools, siteseoHandlers } from './siteseo.js';

// Multi-site management
import { sitesTools, sitesHandlers } from './sites.js';

function buildToolRegistry() {
  const flags = getFeatureFlags();
  const tools: any[] = [];
  const handlers: Record<string, (params: any) => Promise<any>> = {};

  function register(toolList: any[], handlerMap: Record<string, (params: any) => Promise<any>>) {
    tools.push(...toolList);
    Object.assign(handlers, handlerMap);
  }

  // WordPress core — always on
  if (flags.wordpress) {
    register(postsTools, postsHandlers);
    register(pagesTools, pagesHandlers);
    register(categoriesTools, categoriesHandlers);
    register(commentsTools, commentsHandlers);
    register(mediaTools, mediaHandlers);
    register(usersTools, usersHandlers);
    register(pluginsTools, pluginsHandlers);
    register(pluginRepositoryTools, pluginRepositoryHandlers);
    register(menusTools, menusHandlers);
  }

  // Elementor page-building
  if (flags.elementor) {
    register(elementorDataTools, elementorDataHandlers);
    register(elementorStructureTools, elementorStructureHandlers);
    register(elementorSectionsTools, elementorSectionsHandlers);
    register(elementorElementsTools, elementorElementsHandlers);
    register(elementorWidgetsTools, elementorWidgetsHandlers);
  }

  // Elementor global settings (CommunityTech plugin)
  if (flags.elementor_global_settings) {
    register(elementorGlobalSettingsTools, elementorGlobalSettingsHandlers);
  }

  // SiteSEO (CommunityTech plugin)
  if (flags.siteseo) {
    register(siteseoTools, siteseoHandlers);
  }

  // Multi-site management (only when configured)
  if (hasMultiSiteConfig()) {
    register(sitesTools, sitesHandlers);
  }

  return { tools, handlers };
}

const { tools, handlers } = buildToolRegistry();

export const allTools = tools;
export const toolHandlers = handlers;
