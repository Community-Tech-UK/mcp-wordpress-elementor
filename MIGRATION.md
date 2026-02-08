# Migration Guide: Unified MCP WordPress + Elementor Server

This guide covers migrating from the old dual-server setup to the new unified `mcp-wordpress-elementor` server.

## Why Migrate

### Old Setup Problems

**Two separate MCP servers** running against the same WordPress site:
1. `@instawp/mcp-wp` — WordPress CRUD tools (posts, pages, media, users, comments, plugins, etc.)
2. `wp-elementor-mcp` — Elementor page building tools (monolithic 4,685-line server)

**Issues:**
- Tool conflicts when Claude must choose between duplicate post/page tools from different servers
- Monolithic architecture makes maintenance difficult
- Missing features like CSS regeneration
- Inconsistent error handling and validation
- Complex 4-mode system with 12 feature flags

### New Setup Benefits

**Single unified server** with:
- All 71 tools in one place (no more conflicts)
- Modular architecture (14 separate tool files instead of one monolith)
- Better type safety (Zod validation on all inputs)
- New features (`regenerate_elementor_css`, `list_available_widgets`)
- Shared utilities for consistent element traversal, ID generation, and data operations
- Simplified feature flags (3 instead of 12)

## Migration Steps

### Step 1: Build the New Server

```bash
cd mcp-wordpress-elementor
npm install
npm run build
```

Verify the build succeeded:
```bash
ls build/index.js
# Should exist
```

### Step 2: Update MCP Configuration

**Old configuration** (`.mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "instawp": {
      "command": "node",
      "args": ["/path/to/instawp-mcp-wp/build/server.js"],
      "env": {
        "WORDPRESS_BASE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APPLICATION_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    "elementor": {
      "command": "node",
      "args": ["/path/to/wp-elementor-mcp/build/server.js"],
      "env": {
        "WORDPRESS_API_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

**New configuration**:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/Users/suas/work/wordpress/mcp-wordpress-elementor/build/index.js"],
      "env": {
        "WORDPRESS_API_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### Step 3: Verify Installation

1. Restart Claude Code or Claude Desktop
2. Check available tools (should see all 71 tools)
3. Test a basic operation:
   - WordPress: `list_posts` with `per_page: 1`
   - Elementor: `list_elementor_pages` with `per_page: 1`

## Environment Variable Changes

The new server accepts **multiple naming conventions** for flexibility:

| Purpose | Accepted Variable Names |
|---------|-------------------------|
| Site URL | `WORDPRESS_API_URL` or `WORDPRESS_BASE_URL` |
| Application Password | `WORDPRESS_PASSWORD`, `WORDPRESS_APP_PASSWORD`, or `WORDPRESS_APPLICATION_PASSWORD` |
| Username | `WORDPRESS_USERNAME` |

Use whichever matches your existing configuration. The server will normalize them internally.

## Tool Name Changes

All tool names remain **unchanged** from the old servers:

- **WordPress tools** (from `@instawp/mcp-wp`): Ported as-is with identical names and schemas
- **Elementor tools** (from `wp-elementor-mcp`): Ported with same names

**Note:** The old Elementor server had ~15 stub tools that returned "not implemented" errors:
- Template management tools
- Revision history tools
- Bulk operation tools

These stubs were intentionally **not ported**. They will be implemented properly in future releases rather than shipped as error-throwing placeholders.

## Feature Flags

### Old System (wp-elementor-mcp)

Complex 4-mode system with 12 boolean flags:
- `ELEMENTOR_MODE`: essential/standard/advanced/full
- Individual flags: `ENABLE_GLOBAL_SETTINGS`, `ENABLE_ADVANCED_OPERATIONS`, `ENABLE_BULK_OPERATIONS`, etc.

### New System (mcp-wordpress-elementor)

Simplified to **3 flags**:

| Flag | Default | Description |
|------|---------|-------------|
| (none) | WordPress tools ON | Cannot be disabled |
| `DISABLE_ELEMENTOR` | Elementor tools ON | Set to `"true"` to disable all Elementor tools |
| `DISABLE_ELEMENTOR_GLOBAL_SETTINGS` | Global settings tools ON | Set to `"true"` to disable the 11 global settings tools |

**Example**: Disable global settings tools only:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/path/to/mcp-wordpress-elementor/build/index.js"],
      "env": {
        "WORDPRESS_API_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "DISABLE_ELEMENTOR_GLOBAL_SETTINGS": "true"
      }
    }
  }
}
```

## CommunityTech Plugin Requirement

The following features require the **CommunityTech WordPress plugin**:

1. **Global settings tools** (11 tools):
   - `get_elementor_global_colors`, `update_elementor_global_colors`
   - `get_elementor_global_fonts`, `update_elementor_global_fonts`
   - `get_elementor_custom_css`, `update_elementor_custom_css`
   - `get_elementor_site_settings`, `update_elementor_site_settings`
   - `list_elementor_kits`, `get_elementor_kit`, `update_elementor_kit`

2. **CSS regeneration**:
   - `regenerate_elementor_css`

### Installation

If you were using these tools with the old server, the plugin is already deployed. If not:

```bash
# Copy plugin to WordPress
cp -r communitytech-plugin /path/to/wordpress/wp-content/plugins/

# Activate via WP-CLI
wp plugin activate communitytech-plugin

# Or activate via WordPress Admin > Plugins
```

The plugin exposes REST API endpoints under `/wp-json/communitytech/v1/`.

## Rollback Plan

If you encounter issues, you can roll back to the dual-server setup:

1. Restore your old `.mcp.json` configuration
2. Restart Claude Code/Desktop
3. Report issues at https://github.com/yourusername/mcp-wordpress-elementor/issues

## Next Steps

After migration:

1. Test your common workflows with the new server
2. Remove the old server directories (`instawp-mcp-wp`, `wp-elementor-mcp`) after verifying everything works
3. Update any automation scripts or documentation that reference the old server paths
4. Review the new tools: `list_available_widgets` provides schema information for all Elementor widgets

## Support

- **Issues**: https://github.com/yourusername/mcp-wordpress-elementor/issues
- **Documentation**: See `README.md` for full tool reference
- **Plugin Source**: `communitytech-plugin/` directory
