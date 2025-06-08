#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
const execAsync = promisify(exec);
const ExecuteCommandSchema = z.object({
    command: z.string().describe("The command to execute"),
    args: z.array(z.string()).optional().default([]).describe("Command arguments"),
    options: z.object({
        cwd: z.string().optional().describe("Working directory"),
        timeout: z.number().optional().describe("Command timeout in milliseconds"),
        env: z.record(z.string()).optional().describe("Additional environment variables")
    }).optional().default({})
});
const ChangeDirectorySchema = z.object({
    path: z.string().describe("Directory path to change to")
});
const GetCurrentDirectorySchema = z.object({});
const GetTerminalInfoSchema = z.object({});
class TerminalServer {
    constructor() {
        this.server = new Server({
            name: "terminal-server",
            version: "0.1.0"
        }, {
            capabilities: {
                tools: {}
            }
        });
        this.state = {
            currentDirectory: process.cwd(),
            lastExitCode: null,
            lastCommand: null
        };
        this.setupHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
        this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
    }
    async handleListTools() {
        const ToolInputSchema = ToolSchema.shape.inputSchema;
        return {
            tools: [
                {
                    name: "execute_command",
                    description: "Execute a terminal command with arguments and options.",
                    inputSchema: zodToJsonSchema(ExecuteCommandSchema),
                },
                {
                    name: "change_directory",
                    description: "Change the current working directory for subsequent commands.",
                    inputSchema: zodToJsonSchema(ChangeDirectorySchema),
                },
                {
                    name: "get_current_directory",
                    description: "Get the current working directory path.",
                    inputSchema: zodToJsonSchema(GetCurrentDirectorySchema),
                },
                {
                    name: "get_terminal_info",
                    description: "Get information about the terminal environment.",
                    inputSchema: zodToJsonSchema(GetTerminalInfoSchema),
                }
            ]
        };
    }
    formatCommandOutput(stdout, stderr, exitCode) {
        let output = '';
        if (stdout) {
            output += `STDOUT:\n${stdout}\n`;
        }
        if (stderr) {
            output += `STDERR:\n${stderr}\n`;
        }
        if (exitCode !== null) {
            output += `Exit Code: ${exitCode}\n`;
        }
        return output.trim();
    }
    async executeCommand(command, args, options = {}) {
        const fullCommand = `${command} ${args.join(' ')}`;
        const execOptions = {
            cwd: options.cwd || this.state.currentDirectory,
            timeout: options.timeout || 30000,
            env: {
                ...process.env,
                ...options.env
            }
        };
        try {
            const { stdout, stderr } = await execAsync(fullCommand, execOptions);
            this.state.lastExitCode = 0;
            this.state.lastCommand = fullCommand;
            return this.formatCommandOutput(stdout, stderr, 0);
        }
        catch (error) {
            this.state.lastExitCode = error.code || 1;
            this.state.lastCommand = fullCommand;
            return this.formatCommandOutput(error.stdout || '', error.stderr || error.message, error.code || 1);
        }
    }
    async handleCallTool(request) {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case "execute_command": {
                    const parsed = ExecuteCommandSchema.safeParse(args);
                    if (!parsed.success) {
                        throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
                    }
                    const result = await this.executeCommand(parsed.data.command, parsed.data.args, parsed.data.options);
                    return {
                        content: [{ type: "text", text: result }]
                    };
                }
                case "change_directory": {
                    const parsed = ChangeDirectorySchema.safeParse(args);
                    if (!parsed.success) {
                        throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
                    }
                    const newPath = path.resolve(this.state.currentDirectory, parsed.data.path);
                    try {
                        process.chdir(newPath);
                        this.state.currentDirectory = process.cwd();
                        return {
                            content: [{
                                    type: "text",
                                    text: `Current directory changed to: ${this.state.currentDirectory}`
                                }]
                        };
                    }
                    catch (error) {
                        throw new McpError(ErrorCode.InternalError, `Failed to change directory: ${error.message}`);
                    }
                }
                case "get_current_directory": {
                    return {
                        content: [{
                                type: "text",
                                text: `Current directory: ${this.state.currentDirectory}`
                            }]
                    };
                }
                case "get_terminal_info": {
                    const info = {
                        shell: process.env.SHELL || 'unknown',
                        user: process.env.USER || os.userInfo().username,
                        home: os.homedir(),
                        platform: process.platform,
                        currentDirectory: this.state.currentDirectory,
                        lastCommand: this.state.lastCommand,
                        lastExitCode: this.state.lastExitCode
                    };
                    return {
                        content: [{
                                type: "text",
                                text: Object.entries(info)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join('\n')
                            }]
                    };
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        }
        catch (error) {
            if (error instanceof McpError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new McpError(ErrorCode.InternalError, `Error executing tool: ${errorMessage}`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Terminal MCP Server running on stdio");
        console.error("Current directory:", this.state.currentDirectory);
    }
}
const server = new TerminalServer();
server.run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
