# Terminal MCP Server

A Model Context Protocol (MCP) server that enables execution of terminal commands through Claude Desktop.

## Features

- Execute any terminal command with arguments and options
- Navigate between directories while maintaining state
- Get terminal environment information
- Full output capture (stdout, stderr, exit codes)
- Proper error handling and formatting

## Prerequisites

- Node.js v18 or higher
- TypeScript
- Claude Desktop

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd terminal
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Local Development Setup

1. Create or edit your Claude Desktop configuration file:

   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": [
        "/absolute/path/to/terminal/dist/index.js"
      ],
      "env": {
        "PERMISSION_REQUIRED": "true"
      }
    }
  }
}
```

Replace `/absolute/path/to/terminal/` with the actual path to your cloned repository.

2. Restart Claude Desktop

## Available Tools

### execute_command
- Execute any terminal command
- Supports command arguments and options
- Captures full output and exit codes

### change_directory
- Change the current working directory
- Maintains state between commands
- Supports relative and absolute paths

### get_current_directory
- Get the current working directory path

### get_terminal_info
- Get information about the terminal environment
- Shows shell, user, platform, and recent command history

## Usage Examples

Ask Claude to execute terminal commands like:

```
Can you check what's in my current directory?
-> Executes: ls -la

Can you tell me the current directory?
-> Executes: pwd

Can you change to the Downloads folder?
-> Executes: cd ~/Downloads
```

## Security Considerations

- The server requires explicit user permission through Claude Desktop for command execution
- Environment variables can be controlled through the configuration
- Command execution includes timeouts and error handling

## Development

1. Watch for changes:
```bash
npm run watch
```

2. Test changes:
- Make changes to source files in `src/`
- Rebuild using `npm run build`
- Restart Claude Desktop to load changes

## Project Structure

```
/
├── src/
│   └── index.ts    # Main server implementation
├── package.json    # Project configuration and dependencies
├── tsconfig.json  # TypeScript configuration
└── README.md      # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License