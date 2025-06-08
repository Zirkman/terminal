# Terminal MCP Server Setup

## Quick Setup for New Machine

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Update your Claude Desktop config with the absolute path to `/dist/index.js`

## Development Setup

For active development, use `npm run watch` to automatically rebuild on changes.

## Configuration Notes

The server uses the built JavaScript file in `/dist/` - always run `npm run build` after TypeScript changes.

## Security

This server provides terminal access - ensure you understand the security implications before enabling.