# mcp-wordpress-elementor

A unified Model Context Protocol (MCP) server for WordPress content management and Elementor page building. This server merges WordPress CRUD operations with comprehensive Elementor visual editing capabilities, providing 71 tools for AI-assisted website management.

## Features

- **36 WordPress Content Tools**: Manage posts, pages, categories, comments, media, users, and plugins
- **24 Elementor Page Building Tools**: Create and manipulate sections, containers, widgets, and page structure
- **11 Global Settings Tools**: Control Elementor theme colors, fonts, and CSS (requires CommunityTech plugin)
- **Full TypeScript**: Type-safe tool definitions and handlers
- **Modular Architecture**: Clean separation of concerns across 14 tool modules

## Requirements

- Node.js >= 18
- WordPress site with REST API enabled
- Application Password for authentication
- Elementor plugin (for page building tools)
- CommunityTech plugin (for global settings tools)

## Quick Start

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
WORDPRESS_API_URL=https://your-site.com
WORDPRESS_USERNAME=admin
WORDPRESS_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

**Supported Variable Names:**
- `WORDPRESS_API_URL` or `WORDPRESS_BASE_URL` - Your WordPress site URL
- `WORDPRESS_USERNAME` - WordPress username
- `WORDPRESS_PASSWORD`, `WORDPRESS_APP_PASSWORD`, or `WORDPRESS_APPLICATION_PASSWORD` - Application password

### Creating Application Passwords

1. Go to WordPress Admin > Users > Profile
2. Scroll to "Application Passwords" section
3. Enter a name (e.g., "Claude Code MCP")
4. Click "Add New Application Password"
5. Copy the generated password immediately (it won't be shown again)

## MCP Client Configuration

### Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/path/to/mcp-wordpress-elementor/build/server.js"],
      "env": {
        "WORDPRESS_API_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### Other MCP Clients

The server implements the standard MCP protocol and should work with any MCP-compatible client. Adjust the configuration format according to your client's requirements.

## Tool Inventory

### WordPress Content (36 tools)

**Posts**
- `list_posts` - List posts with filters
- `get_post` - Get post by ID
- `create_post` - Create new post
- `update_post` - Update existing post
- `delete_post` - Delete post

**Pages**
- `list_pages` - List pages with filters
- `get_page` - Get page by ID
- `create_page` - Create new page
- `update_page` - Update existing page
- `delete_page` - Delete page

**Categories**
- `list_categories` - List categories
- `get_category` - Get category by ID
- `create_category` - Create new category
- `update_category` - Update category
- `delete_category` - Delete category

**Comments**
- `list_comments` - List comments with filters
- `get_comment` - Get comment by ID
- `create_comment` - Create new comment
- `update_comment` - Update comment
- `delete_comment` - Delete comment

**Media**
- `list_media` - List media library items
- `create_media` - Upload media file
- `edit_media` - Update media metadata
- `delete_media` - Delete media item

**Users**
- `list_users` - List users
- `get_user` - Get user by ID
- `create_user` - Create new user
- `update_user` - Update user
- `delete_user` - Delete user

**Plugins**
- `list_plugins` - List installed plugins
- `get_plugin` - Get plugin details
- `activate_plugin` - Activate plugin
- `deactivate_plugin` - Deactivate plugin
- `create_plugin` - Create plugin file

**Plugin Repository**
- `search_plugin_repository` - Search WordPress.org plugins
- `get_plugin_details` - Get plugin info from repository

### Elementor Page Building (24 tools)

**Data Management**
- `get_elementor_data` - Get complete page JSON
- `update_elementor_data` - Update page JSON
- `get_elementor_data_chunked` - Get page data in chunks for large pages
- `backup_elementor_data` - Create JSON backup
- `get_elementor_templates` - List saved templates

**Structure Analysis**
- `get_page_structure` - Get hierarchical page outline
- `get_elementor_elements` - List all elements with IDs

**Sections & Containers**
- `create_elementor_section` - Create new section
- `create_elementor_container` - Create new container (flexbox)
- `add_column_to_section` - Add column to section
- `duplicate_section` - Clone existing section
- `reorder_top_level_sections` - Change section order

**Element Operations**
- `delete_elementor_element` - Remove element by ID
- `reorder_elements` - Change element order within parent
- `copy_element_settings` - Copy settings between elements
- `find_elements_by_type` - Search for elements by widget type

**Widget Management**
- `add_widget_to_section` - Add widget to section/column
- `insert_widget_at_position` - Insert widget at specific position
- `clone_widget` - Duplicate widget
- `move_widget` - Move widget to different container
- `update_elementor_widget` - Update widget settings
- `get_elementor_widget` - Get widget data by ID
- `update_elementor_section` - Update section settings
- `get_widget_content` - Get rendered widget HTML

### Elementor Global Settings (11 tools)

**Requires CommunityTech WordPress plugin**

**Kit Settings**
- `get_elementor_kit_settings` - Get all global settings

**Colors**
- `get_elementor_global_colors` - Get color palette
- `update_elementor_global_colors` - Update global colors

**Typography**
- `get_elementor_global_fonts` - Get typography settings
- `update_elementor_global_fonts` - Update global fonts

**Theme Style**
- `get_elementor_theme_style` - Get theme-level styles
- `update_elementor_theme_style` - Update theme styles

**Cache & Utilities**
- `get_elementor_css_variables` - Get CSS variable definitions
- `clear_elementor_cache_by_page` - Clear page cache
- `regenerate_elementor_css` - Rebuild CSS files
- `list_available_widgets` - List registered widget types

## Feature Flags

Control which tools are loaded via environment variables:

```env
DISABLE_ELEMENTOR=true                    # Disables 24 page building tools
DISABLE_ELEMENTOR_GLOBAL_SETTINGS=true   # Disables 11 global settings tools
```

WordPress tools are always enabled.

## CommunityTech Plugin

The Elementor global settings tools require the CommunityTech WordPress plugin (located in `../communitytech-plugin/`). This plugin exposes REST API endpoints for Elementor's internal PHP APIs, enabling:

- Global color and font management
- Theme style configuration
- CSS regeneration
- Widget registry access

Without this plugin, the 11 global settings tools will not function.

## Development

```bash
npm run dev          # Watch mode with tsx
npm run build        # TypeScript compilation
npm test             # Run unit + integration tests
npm run test:watch   # Test watch mode
npm run test:smoke   # Smoke tests against live WordPress site
```

### Testing

The test suite includes:

- **Unit tests**: Tool handler logic and utilities
- **Integration tests**: WordPress API interactions (require test site)
- **Smoke tests**: End-to-end validation against live site

Set `WORDPRESS_TEST_API_URL`, `WORDPRESS_TEST_USERNAME`, and `WORDPRESS_TEST_PASSWORD` for integration testing.

## Architecture

### Directory Structure

```
src/
├── tools/          # 14 tool modules (posts, pages, elementor, etc.)
├── utils/          # Shared utilities
│   ├── element-traversal.ts    # Element tree navigation
│   ├── id-generator.ts         # Unique ID generation
│   └── data-operations.ts      # JSON manipulation
├── types/          # TypeScript types and Zod schemas
├── config/         # Feature flags and configuration
└── server.ts       # MCP server entry point
```

### Tool Module Pattern

Each tool module exports:
1. **Tool definitions**: MCP tool schemas with input validation
2. **Handler functions**: Implementation logic for each tool
3. **Type safety**: Full TypeScript coverage with Zod runtime validation

### Key Utilities

- **Element Traversal**: Recursive tree walking for finding/updating Elementor elements
- **ID Generation**: Collision-free 8-character hex IDs for Elementor elements
- **Data Operations**: Immutable JSON transformations with validation

## Known Limitations

### CSS Regeneration

After updating Elementor JSON via `update_elementor_data`, the CSS cache does not automatically regenerate. Use `regenerate_elementor_css` (requires CommunityTech plugin) or manually open the page in Elementor editor and save.

### Large Pages

Pages with extensive Elementor data may hit API payload limits. Use `get_elementor_data_chunked` for large pages.

## Contributing

Contributions are welcome. Please ensure:

- TypeScript compilation passes (`npm run build`)
- Tests pass (`npm test`)
- Code follows existing patterns
- New tools include Zod schemas and proper error handling

## License

GPL-3.0-or-later

## Credits

This project merges:
- [@instawp/mcp-wp](https://github.com/instawp/mcp-wp) - WordPress CRUD operations
- wp-elementor-mcp - Elementor page building tools

Built with [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) ^1.4.1.
