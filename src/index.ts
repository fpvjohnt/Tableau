#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { TableauController } from './tableau-controller.js';
import { UIElementDetector } from './ui-detector.js';
import { WorksheetManager } from './worksheet-manager.js';
import { DashboardManager } from './dashboard-manager.js';
import { SystemController } from './system-controller.js';

/**
 * Tableau MCP Server
 * Provides intelligent AI control over Tableau Desktop
 * Supports cross-platform operation (Mac/Windows)
 */
class TableauMCPServer {
  private server: Server;
  private tableauController: TableauController;
  private uiDetector: UIElementDetector;
  private worksheetManager: WorksheetManager;
  private dashboardManager: DashboardManager;
  private systemController: SystemController;

  constructor() {
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tableau MCP Server running on stdio');
  }
}

// Start the server
const server = new TableauMCPServer();
server.run().catch(console.error);