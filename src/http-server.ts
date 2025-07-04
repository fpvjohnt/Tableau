#!/usr/bin/env node

import * as http from 'http';
import * as url from 'url';

import { TableauController } from './tableau-controller.js';
import { UIElementDetector } from './ui-detector.js';
import { WorksheetManager } from './worksheet-manager.js';
import { DashboardManager } from './dashboard-manager.js';
import { SystemController } from './system-controller.js';

/**
 * HTTP-based Tableau MCP Server
 * Provides REST API for remote Claude Desktop connections
 */
class HttpTableauMCPServer {
  private tableauController: TableauController;
  private uiDetector: UIElementDetector;
  private worksheetManager: WorksheetManager;
  private dashboardManager: DashboardManager;
  private systemController: SystemController;
  private httpServer!: http.Server;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;

    // Initialize controllers
    this.systemController = new SystemController();
    this.tableauController = new TableauController(this.systemController);
    this.uiDetector = new UIElementDetector(this.systemController);
    this.worksheetManager = new WorksheetManager(this.tableauController, this.uiDetector);
    this.dashboardManager = new DashboardManager(this.tableauController, this.uiDetector);

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

      if (req.method === 'POST') {
        await this.handlePostRequest(req, res, parsedUrl);
      } else if (req.method === 'GET') {
        await this.handleGetRequest(req, res, parsedUrl);
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    });
  }

  private async handleGetRequest(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
    if (parsedUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        server: 'tableau-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }));
    } else if (parsedUrl.pathname === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tools: [
          {
            name: 'tableau_create_worksheet',
            description: 'Create a new worksheet in Tableau with intelligent AI guidance',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name for the new worksheet' },
                dataSource: { type: 'string', description: 'Data source to connect to (optional)' },
                chartType: { type: 'string', description: 'Type of visualization (bar, line, scatter, map, etc.)' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Fields to include in the visualization' },
                instructions: { type: 'string', description: 'Detailed instructions for worksheet creation' },
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
                name: { type: 'string', description: 'Name for the new dashboard' },
                worksheets: { type: 'array', items: { type: 'string' }, description: 'List of worksheets to include' },
                layout: { type: 'string', description: 'Dashboard layout style (grid, floating, tiled)', default: 'tiled' },
                filters: { type: 'array', items: { type: 'string' }, description: 'Global filters to add' },
                instructions: { type: 'string', description: 'Detailed instructions for dashboard creation' },
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
                action: { type: 'string', description: 'Menu action to perform' },
                target: { type: 'string', description: 'Specific menu item or location to navigate to' },
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
                worksheet: { type: 'string', description: 'Name of worksheet to modify' },
                modifications: { type: 'string', description: 'Description of changes to make' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Fields to add, remove, or modify' },
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
                sourceType: { type: 'string', description: 'Type of data source (Excel, CSV, Database, etc.)' },
                filePath: { type: 'string', description: 'Path to data file (for file-based sources)' },
                connectionString: { type: 'string', description: 'Database connection string (for database sources)' },
                instructions: { type: 'string', description: 'Additional connection instructions' },
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
                focus: { type: 'string', description: 'What to analyze (worksheets, data, menus, errors)', default: 'general' },
              },
            },
          },
          {
            name: 'tableau_list_workbooks',
            description: 'List all workbooks and their worksheets/dashboards in current Tableau session',
            inputSchema: {
              type: 'object',
              properties: {
                includeDetails: { type: 'boolean', description: 'Include detailed information about each item', default: true },
              },
            },
          },
          {
            name: 'tableau_detect_current_state',
            description: 'Detect current Tableau Desktop state and active content',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'tableau_smart_actions',
            description: 'Perform intelligent actions based on natural language commands',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'Natural language command for Tableau action' },
                context: { type: 'string', description: 'Additional context about current state' },
              },
              required: ['command'],
            },
          },
        ]
      }));
    } else if (parsedUrl.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Tableau MCP Server</title></head>
          <body>
            <h1>Tableau MCP Server</h1>
            <p>HTTP-based server for remote Tableau automation</p>
            <ul>
              <li><strong>Health Check:</strong> <a href="/health">GET /health</a></li>
              <li><strong>Available Tools:</strong> <a href="/tools">GET /tools</a></li>
              <li><strong>Execute Tool:</strong> POST /execute/{toolName}</li>
            </ul>
            <h2>Available Tools:</h2>
            <ul>
              <li>POST /execute/tableau_create_worksheet</li>
              <li>POST /execute/tableau_create_dashboard</li>
              <li>POST /execute/tableau_navigate_menu</li>
              <li>POST /execute/tableau_modify_visualization</li>
              <li>POST /execute/tableau_connect_data</li>
              <li>POST /execute/tableau_analyze_interface</li>
              <li>POST /execute/tableau_smart_actions</li>
            </ul>
            <h2>Example Usage:</h2>
            <pre>curl -X POST http://YOUR_LINUX_IP:${this.port}/execute/tableau_create_worksheet \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Sales Chart", "chartType": "bar", "instructions": "Create a bar chart"}'</pre>
          </body>
        </html>
      `);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  private async handlePostRequest(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery): Promise<void> {
    const pathname = parsedUrl.pathname || '';
    
    if (!pathname.startsWith('/execute/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    const toolName = pathname.replace('/execute/', '');
    
    // Read request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const args = JSON.parse(body);
        const result = await this.executeTool(toolName, args);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          tool: toolName
        }));
      }
    });
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
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

      case 'tableau_list_workbooks':
        return await this.handleListWorkbooks(args);

      case 'tableau_detect_current_state':
        return await this.handleDetectCurrentState(args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Tool handlers
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
      success: result.success,
      message: `Successfully created worksheet "${name}". ${result.message}`,
      worksheetName: result.worksheetName,
      actionsPerformed: result.actionsPerformed,
      suggestions: result.suggestions
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
      success: result.success,
      message: `Successfully created dashboard "${name}". ${result.message}`,
      dashboardName: result.dashboardName,
      actionsPerformed: result.actionsPerformed,
      suggestions: result.suggestions
    };
  }

  private async handleNavigateMenu(args: any) {
    const { action, target } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.tableauController.navigateMenu(action, target);

    return {
      success: result.success,
      message: `Navigation completed: ${result.message}`,
      currentState: result.currentState
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
      success: result.success,
      message: `Modified visualization in "${worksheet}": ${result.message}`,
      worksheetName: result.worksheetName,
      actionsPerformed: result.actionsPerformed,
      suggestions: result.suggestions
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
      success: result.success,
      message: `Connected to ${sourceType} data source: ${result.message}`,
      currentState: result.currentState
    };
  }

  private async handleAnalyzeInterface(args: any) {
    const { focus } = args;
    
    const analysis = await this.uiDetector.analyzeInterface(focus);

    return {
      success: true,
      message: 'Interface analysis completed',
      analysis: {
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        currentContext: analysis.currentContext,
        availableActions: analysis.availableActions,
        elementCount: analysis.elements.length
      }
    };
  }

  private async handleSmartActions(args: any) {
    const { command, context } = args;
    
    await this.tableauController.ensureTableauActive();
    const result = await this.tableauController.executeSmartCommand(command, context);

    return {
      success: result.success,
      message: `Smart Action Executed: ${result.message}`,
      actionsPerformed: result.actionsPerformed
    };
  }

  private async handleListWorkbooks(args: any) {
    const { includeDetails } = args;
    
    await this.tableauController.ensureTableauActive();
    const workbooks = await this.tableauController.listWorkbooks(includeDetails);

    return {
      success: true,
      message: `Found ${workbooks.length} workbook(s)`,
      workbooks: workbooks,
      totalWorkbooks: workbooks.length,
      currentWorkbook: workbooks.find(w => w.isActive)?.name || 'Unknown'
    };
  }

  private async handleDetectCurrentState(args: any) {
    await this.tableauController.ensureTableauActive();
    const state = await this.tableauController.detectCurrentState();

    return {
      success: true,
      message: 'Current Tableau state detected',
      state: state,
      isTableauOpen: state.isTableauOpen,
      activeWorkbook: state.activeWorkbook,
      activeWorksheet: state.activeWorksheet,
      connectedDataSources: state.connectedDataSources
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.error(`Tableau HTTP MCP Server running on http://0.0.0.0:${this.port}`);
        console.error(`Health check: http://0.0.0.0:${this.port}/health`);
        console.error(`Tools list: http://0.0.0.0:${this.port}/tools`);
        resolve();
      });
    });
  }
}

// Start the HTTP server
const port = parseInt(process.env.PORT || '3000', 10);
const server = new HttpTableauMCPServer(port);
server.start().catch(console.error);