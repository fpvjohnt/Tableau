#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as http from 'http';
import * as url from 'url';

import { TableauController } from './tableau-controller.js';
import { UIElementDetector } from './ui-detector.js';
import { WorksheetManager } from './worksheet-manager.js';
import { DashboardManager } from './dashboard-manager.js';
import { SystemController } from './system-controller.js';

/**
 * Network-enabled Tableau MCP Server
 * Runs as HTTP server for remote Claude Desktop connections
 */
class NetworkTableauMCPServer {
  private server: Server;
  private tableauController: TableauController;
  private uiDetector: UIElementDetector;
  private worksheetManager: WorksheetManager;
  private dashboardManager: DashboardManager;
  private systemController: SystemController;
  private httpServer!: http.Server;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.server = new Server(
      {
        name: 'tableau-mcp-server',
        version: '1.0.0',
      }
    );

    // Initialize controllers
    this.systemController = new SystemController();
    this.tableauController = new TableauController(this.systemController);
    this.uiDetector = new UIElementDetector(this.systemController);
    this.worksheetManager = new WorksheetManager(this.tableauController, this.uiDetector);
    this.dashboardManager = new DashboardManager(this.tableauController, this.uiDetector);

    this.setupToolHandlers();
    this.setupHttpServer();
  }

  private setupHttpServer(): void {
    this.httpServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (parsedUrl.pathname === '/sse') {
        // Handle SSE connection for MCP
        const transport = new SSEServerTransport('/sse', res);
        await this.server.connect(transport);
        console.error(`Client connected via SSE from ${req.connection.remoteAddress}`);
      } else if (parsedUrl.pathname === '/health') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          server: 'tableau-mcp-server',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }));
      } else if (parsedUrl.pathname === '/') {
        // Basic info page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>Tableau MCP Server</title></head>
            <body>
              <h1>Tableau MCP Server</h1>
              <p>Server is running and ready for connections.</p>
              <ul>
                <li><strong>Health Check:</strong> <a href="/health">/health</a></li>
                <li><strong>SSE Endpoint:</strong> /sse</li>
                <li><strong>Port:</strong> ${this.port}</li>
              </ul>
              <h2>For Claude Desktop</h2>
              <p>Add this to your Claude Desktop MCP configuration:</p>
              <pre>{
  "mcpServers": {
    "tableau": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-client", "http://YOUR_LINUX_IP:${this.port}/sse"]
    }
  }
}</pre>
            </body>
          </html>
        `);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'tableau_create_worksheet',
            description: 'Create a new worksheet in Tableau with intelligent AI guidance',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name for the new worksheet',
                },
                dataSource: {
                  type: 'string',
                  description: 'Data source to connect to (optional)',
                },
                chartType: {
                  type: 'string',
                  description: 'Type of visualization (bar, line, scatter, map, etc.)',
                },
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fields to include in the visualization',
                },
                instructions: {
                  type: 'string',
                  description: 'Detailed instructions for worksheet creation',
                },
              },
              required: ['name', 'instructions'],
            },
          },
          {
            name: 'tableau_create_dashboard',
            description: 'Create a new dashboard in Tableau with AI-driven layout',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name for the new dashboard',
                },
                worksheets: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of worksheets to include',
                },
                layout: {
                  type: 'string',
                  description: 'Dashboard layout style (grid, floating, tiled)',
                  default: 'tiled',
                },
                filters: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Global filters to add',
                },
                instructions: {
                  type: 'string',
                  description: 'Detailed instructions for dashboard creation',
                },
              },
              required: ['name', 'instructions'],
            },
          },
          {
            name: 'tableau_navigate_menu',
            description: 'Navigate Tableau menus intelligently with AI awareness',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'Menu action to perform (e.g., "open data menu", "create calculated field")',
                },
                target: {
                  type: 'string',
                  description: 'Specific menu item or location to navigate to',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'tableau_modify_visualization',
            description: 'Modify existing visualizations with AI intelligence',
            inputSchema: {
              type: 'object',
              properties: {
                worksheet: {
                  type: 'string',
                  description: 'Name of worksheet to modify',
                },
                modifications: {
                  type: 'string',
                  description: 'Description of changes to make',
                },
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fields to add, remove, or modify',
                },
              },
              required: ['worksheet', 'modifications'],
            },
          },
          {
            name: 'tableau_connect_data',
            description: 'Connect to data sources with intelligent assistance',
            inputSchema: {
              type: 'object',
              properties: {
                sourceType: {
                  type: 'string',
                  description: 'Type of data source (Excel, CSV, Database, etc.)',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to data file (for file-based sources)',
                },
                connectionString: {
                  type: 'string',
                  description: 'Database connection string (for database sources)',
                },
                instructions: {
                  type: 'string',
                  description: 'Additional connection instructions',
                },
              },
              required: ['sourceType'],
            },
          },
          {
            name: 'tableau_analyze_interface',
            description: 'Analyze current Tableau interface and provide AI insights',
            inputSchema: {
              type: 'object',
              properties: {
                focus: {
                  type: 'string',
                  description: 'What to analyze (worksheets, data, menus, errors)',
                  default: 'general',
                },
              },
            },
          },
          {
            name: 'tableau_smart_actions',
            description: 'Perform intelligent actions based on natural language commands',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Natural language command for Tableau action',
                },
                context: {
                  type: 'string',
                  description: 'Additional context about current state',
                },
              },
              required: ['command'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'tableau_create_worksheet':
            return await this.handleCreateWorksheet(args);

          case 'tableau_create_dashboard':
            return await this.handleCreateDashboard(args);

          case 'tableau_navigate_menu':
            return await this.handleNavigateMenu(args);

          case 'tableau_modify_visualization':
            return await this.handleModifyVisualization(args);

          case 'tableau_connect_data':
            return await this.handleConnectData(args);

          case 'tableau_analyze_interface':
            return await this.handleAnalyzeInterface(args);

          case 'tableau_smart_actions':
            return await this.handleSmartActions(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool handlers (same as stdio version)
  private async handleCreateWorksheet(args: any) {
    const { name, dataSource, chartType, fields, instructions } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.worksheetManager.createWorksheet({
      name,
      dataSource,
      chartType,
      fields,
      instructions,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created worksheet "${name}". ${result.message}`,
        },
      ],
    };
  }

  private async handleCreateDashboard(args: any) {
    const { name, worksheets, layout, filters, instructions } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.dashboardManager.createDashboard({
      name,
      worksheets,
      layout,
      filters,
      instructions,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created dashboard "${name}". ${result.message}`,
        },
      ],
    };
  }

  private async handleNavigateMenu(args: any) {
    const { action, target } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.tableauController.navigateMenu(action, target);

    return {
      content: [
        {
          type: 'text',
          text: `Navigation completed: ${result.message}`,
        },
      ],
    };
  }

  private async handleModifyVisualization(args: any) {
    const { worksheet, modifications, fields } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.worksheetManager.modifyVisualization({
      worksheet,
      modifications,
      fields,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Modified visualization in "${worksheet}": ${result.message}`,
        },
      ],
    };
  }

  private async handleConnectData(args: any) {
    const { sourceType, filePath, connectionString, instructions } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.tableauController.connectToDataSource({
      sourceType,
      filePath,
      connectionString,
      instructions,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Connected to ${sourceType} data source: ${result.message}`,
        },
      ],
    };
  }

  private async handleAnalyzeInterface(args: any) {
    const { focus } = args;
    
    const analysis = await this.uiDetector.analyzeInterface(focus);

    return {
      content: [
        {
          type: 'text',
          text: `Interface Analysis:\n${analysis.summary}\n\nRecommendations:\n${analysis.recommendations.join('\n')}`,
        },
      ],
    };
  }

  private async handleSmartActions(args: any) {
    const { command, context } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.tableauController.executeSmartCommand(command, context);

    return {
      content: [
        {
          type: 'text',
          text: `Smart Action Executed: ${result.message}`,
        },
      ],
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.error(`Tableau MCP Server running on http://0.0.0.0:${this.port}`);
        console.error(`Health check: http://0.0.0.0:${this.port}/health`);
        console.error(`SSE endpoint: http://0.0.0.0:${this.port}/sse`);
        resolve();
      });
    });
  }
}

// Start the network server
const port = parseInt(process.env.PORT || '3000', 10);
const server = new NetworkTableauMCPServer(port);
server.start().catch(console.error);