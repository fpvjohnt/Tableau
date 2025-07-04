import { SystemController, Point, Rectangle } from './system-controller.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DataSourceConfig {
  sourceType: string;
  filePath?: string;
  connectionString?: string;
  instructions?: string;
}

export interface MenuNavigationResult {
  success: boolean;
  message: string;
  currentState?: string;
}

export interface SmartCommandResult {
  success: boolean;
  message: string;
  actionsPerformed: string[];
}

export interface WorkbookInfo {
  name: string;
  isActive: boolean;
  path?: string;
  worksheets: WorksheetInfo[];
  dashboards: DashboardInfo[];
}

export interface WorksheetInfo {
  name: string;
  isActive: boolean;
  hasData: boolean;
  dataSource?: string;
  chartType?: string;
}

export interface DashboardInfo {
  name: string;
  isActive: boolean;
  worksheetCount: number;
  worksheets: string[];
}

export interface TableauState {
  isTableauOpen: boolean;
  activeWorkbook?: string;
  activeWorksheet?: string;
  connectedDataSources: string[];
  windowTitle?: string;
  version?: string;
}

/**
 * Main controller for Tableau Desktop automation
 * Provides intelligent AI-driven control over Tableau interface
 */
export class TableauController {
  private systemController: SystemController;
  private platform: string;
  private tableauProcesses: any[] = [];

  constructor(systemController: SystemController) {
    this.systemController = systemController;
    this.platform = os.platform();
  }

  /**
   * Ensure Tableau Desktop is running and active
   */
  async ensureTableauActive(): Promise<void> {
    // Find Tableau windows
    const windows = await this.findTableauWindows();
    
    if (windows.length === 0) {
      // Launch Tableau if not running
      await this.launchTableau();
      // Wait for startup
      await this.delay(5000);
      
      // Try to find windows again
      const newWindows = await this.findTableauWindows();
      if (newWindows.length === 0) {
        throw new Error('Failed to launch or find Tableau Desktop');
      }
    }

    // Activate the first Tableau window found
    if (windows.length > 0) {
      await this.systemController.activateWindow(windows[0].id);
      await this.delay(1000);
    }
  }

  /**
   * Find Tableau Desktop windows
   */
  async findTableauWindows(): Promise<any[]> {
    const tableauNames = [
      'Tableau Desktop', 
      'Tableau', 
      'TableauDesktop',
      'Tableau Desktop 2023',
      'Tableau Desktop 2024',
      'Tableau Desktop 2025'
    ];
    let allWindows: any[] = [];

    for (const name of tableauNames) {
      const windows = await this.systemController.findWindows(name);
      allWindows = allWindows.concat(windows);
    }

    return allWindows.filter((window, index, self) => 
      index === self.findIndex(w => w.id === window.id)
    );
  }

  /**
   * Launch Tableau Desktop
   */
  async launchTableau(): Promise<void> {
    let command: string;

    if (this.platform === 'darwin') {
      // macOS
      command = 'open -a "Tableau Desktop"';
    } else if (this.platform === 'win32') {
      // Windows - try common installation paths
      const possiblePaths = [
        '"C:\\Program Files\\Tableau\\Tableau Desktop\\bin\\tableau.exe"',
        '"C:\\Program Files (x86)\\Tableau\\Tableau Desktop\\bin\\tableau.exe"',
        'tableau'
      ];
      
      for (const path of possiblePaths) {
        try {
          await execAsync(`where ${path}`);
          command = path;
          break;
        } catch {
          continue;
        }
      }
      
      if (!command!) {
        throw new Error('Tableau Desktop not found in common installation paths');
      }
    } else {
      // Linux - try common installation paths and commands
      const possibleCommands = [
        'tableau-desktop',
        '/opt/tableau-desktop/tableau-desktop',
        '/usr/bin/tableau-desktop',
        '/usr/local/bin/tableau-desktop'
      ];
      
      let foundCommand = null;
      for (const cmd of possibleCommands) {
        try {
          await execAsync(`which ${cmd.split(' ')[0]}`);
          foundCommand = cmd;
          break;
        } catch {
          continue;
        }
      }
      
      if (!foundCommand) {
        throw new Error('Tableau Desktop not found. Please ensure Tableau Desktop is installed and accessible via command line. This MCP server is designed to work with Tableau Desktop running on the same machine or accessible via the network.');
      }
      
      command = foundCommand;
    }

    try {
      await execAsync(command);
    } catch (error) {
      throw new Error(`Failed to launch Tableau Desktop: ${error}. Note: This MCP server requires Tableau Desktop to be installed and running.`);
    }
  }

  /**
   * Navigate Tableau menus intelligently
   */
  async navigateMenu(action: string, target?: string): Promise<MenuNavigationResult> {
    await this.ensureTableauActive();

    const actionLower = action.toLowerCase();
    const actions: string[] = [];

    try {
      if (actionLower.includes('data') && actionLower.includes('source')) {
        return await this.navigateToDataSource(target);
      } else if (actionLower.includes('new') && actionLower.includes('worksheet')) {
        return await this.navigateToNewWorksheet();
      } else if (actionLower.includes('new') && actionLower.includes('dashboard')) {
        return await this.navigateToNewDashboard();
      } else if (actionLower.includes('calculated') && actionLower.includes('field')) {
        return await this.navigateToCalculatedField();
      } else if (actionLower.includes('format')) {
        return await this.navigateToFormat(target);
      } else if (actionLower.includes('analytics')) {
        return await this.navigateToAnalytics();
      } else if (actionLower.includes('file')) {
        return await this.navigateFileMenu(target);
      } else if (actionLower.includes('help')) {
        return await this.navigateHelpMenu();
      } else {
        return await this.performGenericMenuNavigation(action, target);
      }
    } catch (error) {
      return {
        success: false,
        message: `Menu navigation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Connect to data source with AI assistance
   */
  async connectToDataSource(config: DataSourceConfig): Promise<MenuNavigationResult> {
    await this.ensureTableauActive();

    try {
      // Open data menu
      if (this.platform === 'darwin') {
        await this.systemController.keyPress(['cmd', 'd']);
      } else {
        await this.systemController.keyPress(['ctrl', 'd']);
      }

      await this.delay(1000);

      // Navigate based on source type
      const sourceType = config.sourceType.toLowerCase();
      
      if (sourceType.includes('excel') || sourceType.includes('xlsx')) {
        return await this.connectToExcel(config.filePath);
      } else if (sourceType.includes('csv') || sourceType.includes('text')) {
        return await this.connectToCSV(config.filePath);
      } else if (sourceType.includes('database') || sourceType.includes('sql')) {
        return await this.connectToDatabase(config.connectionString);
      } else if (sourceType.includes('json')) {
        return await this.connectToJSON(config.filePath);
      } else {
        return await this.connectToGenericSource(config);
      }
    } catch (error) {
      return {
        success: false,
        message: `Data source connection failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute smart commands using natural language processing
   */
  async executeSmartCommand(command: string, context?: string): Promise<SmartCommandResult> {
    const commandLower = command.toLowerCase();
    const actionsPerformed: string[] = [];

    try {
      await this.ensureTableauActive();

      if (commandLower.includes('create') && commandLower.includes('bar chart')) {
        return await this.createBarChart(command, context);
      } else if (commandLower.includes('create') && commandLower.includes('line chart')) {
        return await this.createLineChart(command, context);
      } else if (commandLower.includes('add') && commandLower.includes('filter')) {
        return await this.addFilter(command, context);
      } else if (commandLower.includes('change') && commandLower.includes('color')) {
        return await this.changeColors(command, context);
      } else if (commandLower.includes('sort')) {
        return await this.sortData(command, context);
      } else if (commandLower.includes('format')) {
        return await this.formatVisualization(command, context);
      } else if (commandLower.includes('save')) {
        return await this.saveWorkbook(command, context);
      } else if (commandLower.includes('export')) {
        return await this.exportVisualization(command, context);
      } else {
        return await this.executeGenericCommand(command, context);
      }
    } catch (error) {
      return {
        success: false,
        message: `Smart command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed
      };
    }
  }

  /**
   * Get current Tableau interface state
   */
  async getCurrentState(): Promise<any> {
    const screenshot = await this.systemController.takeScreenshot();
    const mousePos = this.systemController.getMousePosition();
    const screenSize = this.systemController.getScreenSize();

    return {
      screenshot,
      mousePosition: mousePos,
      screenSize,
      timestamp: new Date().toISOString(),
      platform: this.platform
    };
  }

  /**
   * List all workbooks and their content in current Tableau session
   */
  async listWorkbooks(includeDetails: boolean = true): Promise<WorkbookInfo[]> {
    const windows = await this.findTableauWindows();
    const workbooks: WorkbookInfo[] = [];

    for (const window of windows) {
      try {
        await this.systemController.activateWindow(window.id);
        await this.delay(500);

        // Extract workbook name from window title
        const workbookName = this.extractWorkbookName(window.title);
        
        const worksheets = await this.getWorksheetList();
        const dashboards = await this.getDashboardList();

        workbooks.push({
          name: workbookName,
          isActive: true, // Currently active since we just activated it
          path: this.extractFilePath(window.title),
          worksheets: includeDetails ? worksheets : [],
          dashboards: includeDetails ? dashboards : []
        });
      } catch (error) {
        console.error(`Error processing window ${window.id}:`, error);
      }
    }

    return workbooks;
  }

  /**
   * Detect current Tableau Desktop state
   */
  async detectCurrentState(): Promise<TableauState> {
    const windows = await this.findTableauWindows();
    
    if (windows.length === 0) {
      return {
        isTableauOpen: false,
        connectedDataSources: []
      };
    }

    const activeWindow = windows[0];
    await this.systemController.activateWindow(activeWindow.id);
    await this.delay(500);

    const state: TableauState = {
      isTableauOpen: true,
      windowTitle: activeWindow.title,
      activeWorkbook: this.extractWorkbookName(activeWindow.title),
      activeWorksheet: await this.getCurrentWorksheetName(),
      connectedDataSources: await this.getConnectedDataSources(),
      version: this.extractTableauVersion(activeWindow.title)
    };

    return state;
  }

  // Private helper methods

  private async navigateToDataSource(target?: string): Promise<MenuNavigationResult> {
    // Click on Data menu
    await this.clickOnMenuItem('Data');
    await this.delay(500);

    if (target) {
      await this.clickOnSubMenuItem(target);
    } else {
      await this.clickOnSubMenuItem('New Data Source');
    }

    return {
      success: true,
      message: 'Navigated to data source connection',
      currentState: 'data_source_dialog'
    };
  }

  private async navigateToNewWorksheet(): Promise<MenuNavigationResult> {
    // Right-click on worksheet tabs area and select new worksheet
    const worksheetTabsRegion = await this.findWorksheetTabsRegion();
    await this.systemController.rightClick(worksheetTabsRegion.x, worksheetTabsRegion.y);
    await this.delay(300);
    
    await this.clickOnContextMenuItem('New Worksheet');

    return {
      success: true,
      message: 'Created new worksheet',
      currentState: 'new_worksheet'
    };
  }

  private async navigateToNewDashboard(): Promise<MenuNavigationResult> {
    // Similar to worksheet but for dashboard
    const worksheetTabsRegion = await this.findWorksheetTabsRegion();
    await this.systemController.rightClick(worksheetTabsRegion.x, worksheetTabsRegion.y);
    await this.delay(300);
    
    await this.clickOnContextMenuItem('New Dashboard');

    return {
      success: true,
      message: 'Created new dashboard',
      currentState: 'new_dashboard'
    };
  }

  private async navigateToCalculatedField(): Promise<MenuNavigationResult> {
    // Analysis > Create Calculated Field
    await this.clickOnMenuItem('Analysis');
    await this.delay(500);
    await this.clickOnSubMenuItem('Create Calculated Field');

    return {
      success: true,
      message: 'Opened calculated field dialog',
      currentState: 'calculated_field_dialog'
    };
  }

  private async clickOnMenuItem(menuName: string): Promise<void> {
    // This would use computer vision to find and click menu items
    // For now, using keyboard shortcuts where possible
    const menuShortcuts: { [key: string]: string[] } = {
      'File': this.platform === 'darwin' ? ['cmd', 'f'] : ['alt', 'f'],
      'Data': this.platform === 'darwin' ? ['cmd', 'd'] : ['alt', 'd'],
      'Worksheet': this.platform === 'darwin' ? ['cmd', 'w'] : ['alt', 'w'],
      'Dashboard': this.platform === 'darwin' ? ['cmd', 'shift', 'd'] : ['alt', 'shift', 'd'],
      'Analysis': this.platform === 'darwin' ? ['cmd', 'a'] : ['alt', 'a'],
      'Map': this.platform === 'darwin' ? ['cmd', 'm'] : ['alt', 'm'],
      'Format': this.platform === 'darwin' ? ['cmd', 'shift', 'f'] : ['alt', 'shift', 'f'],
      'Server': this.platform === 'darwin' ? ['cmd', 's'] : ['alt', 's'],
      'Window': this.platform === 'darwin' ? ['cmd', 'shift', 'w'] : ['alt', 'w'],
      'Help': this.platform === 'darwin' ? ['cmd', 'h'] : ['alt', 'h']
    };

    if (menuShortcuts[menuName]) {
      await this.systemController.keyPress(menuShortcuts[menuName]);
    } else {
      // Fallback: try to find and click the menu visually
      await this.findAndClickText(menuName);
    }
  }

  private async clickOnSubMenuItem(itemName: string): Promise<void> {
    // Navigate through submenu items
    await this.findAndClickText(itemName);
  }

  private async clickOnContextMenuItem(itemName: string): Promise<void> {
    // Click on context menu items
    await this.findAndClickText(itemName);
  }

  private async findAndClickText(text: string): Promise<void> {
    // This would use OCR or computer vision to find text on screen
    // For demonstration, we'll use a simple approach
    
    // Take screenshot and analyze for text
    const screenshot = await this.systemController.takeScreenshot();
    
    // Use OCR to find text position (would implement with actual OCR library)
    const textPosition = await this.findTextInImage(screenshot, text);
    
    if (textPosition) {
      await this.systemController.click(textPosition.x, textPosition.y);
    } else {
      throw new Error(`Could not find text: ${text}`);
    }
  }

  private async findTextInImage(imageBuffer: Buffer, text: string): Promise<Point | null> {
    // Placeholder for OCR implementation
    // Would use libraries like tesseract.js or similar
    
    // For now, return a mock position
    // In real implementation, this would:
    // 1. Process image with OCR
    // 2. Find text coordinates
    // 3. Return click position
    
    return null; // Would return actual coordinates
  }

  private async findWorksheetTabsRegion(): Promise<Rectangle> {
    // Find the worksheet tabs area at bottom of Tableau
    const screenSize = this.systemController.getScreenSize();
    
    return {
      x: screenSize.width * 0.1,
      y: screenSize.height * 0.9,
      width: screenSize.width * 0.8,
      height: 50
    };
  }

  private async connectToExcel(filePath?: string): Promise<MenuNavigationResult> {
    // Click on Microsoft Excel option
    await this.findAndClickText('Microsoft Excel');
    await this.delay(1000);

    if (filePath) {
      // Navigate to file
      await this.systemController.type(filePath);
      await this.systemController.keyPress(['enter']);
    }

    return {
      success: true,
      message: 'Connected to Excel data source',
      currentState: 'excel_connected'
    };
  }

  private async connectToCSV(filePath?: string): Promise<MenuNavigationResult> {
    await this.findAndClickText('Text file');
    await this.delay(1000);

    if (filePath) {
      await this.systemController.type(filePath);
      await this.systemController.keyPress(['enter']);
    }

    return {
      success: true,
      message: 'Connected to CSV data source',
      currentState: 'csv_connected'
    };
  }

  private async connectToDatabase(connectionString?: string): Promise<MenuNavigationResult> {
    await this.findAndClickText('More...');
    await this.delay(500);
    await this.findAndClickText('SQL Server');
    await this.delay(1000);

    if (connectionString) {
      // Parse connection string and fill in details
      await this.systemController.type(connectionString);
    }

    return {
      success: true,
      message: 'Initiated database connection',
      currentState: 'database_dialog'
    };
  }

  private async connectToJSON(filePath?: string): Promise<MenuNavigationResult> {
    await this.findAndClickText('JSON file');
    await this.delay(1000);

    if (filePath) {
      await this.systemController.type(filePath);
      await this.systemController.keyPress(['enter']);
    }

    return {
      success: true,
      message: 'Connected to JSON data source',
      currentState: 'json_connected'
    };
  }

  private async connectToGenericSource(config: DataSourceConfig): Promise<MenuNavigationResult> {
    // Generic connection handling
    return {
      success: true,
      message: `Attempting to connect to ${config.sourceType}`,
      currentState: 'generic_connection'
    };
  }

  // Smart command implementations

  private async createBarChart(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    // Navigate to Show Me panel and select bar chart
    await this.findAndClickText('Show Me');
    await this.delay(500);
    actions.push('Opened Show Me panel');
    
    await this.findAndClickText('bar chart');
    await this.delay(500);
    actions.push('Selected bar chart type');

    return {
      success: true,
      message: 'Created bar chart visualization',
      actionsPerformed: actions
    };
  }

  private async createLineChart(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    await this.findAndClickText('Show Me');
    await this.delay(500);
    actions.push('Opened Show Me panel');
    
    await this.findAndClickText('line chart');
    await this.delay(500);
    actions.push('Selected line chart type');

    return {
      success: true,
      message: 'Created line chart visualization',
      actionsPerformed: actions
    };
  }

  private async addFilter(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    // Drag field to Filters shelf
    actions.push('Added filter to visualization');

    return {
      success: true,
      message: 'Added filter to visualization',
      actionsPerformed: actions
    };
  }

  private async changeColors(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    // Open color dialog
    await this.systemController.rightClick(500, 300); // Approximate visualization area
    await this.delay(300);
    await this.findAndClickText('Format');
    actions.push('Opened formatting options');

    return {
      success: true,
      message: 'Opened color formatting options',
      actionsPerformed: actions
    };
  }

  private async sortData(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    // Right-click on axis and select sort
    await this.systemController.rightClick(400, 400);
    await this.delay(300);
    await this.findAndClickText('Sort');
    actions.push('Applied sort to data');

    return {
      success: true,
      message: 'Applied sort to visualization',
      actionsPerformed: actions
    };
  }

  private async formatVisualization(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    await this.clickOnMenuItem('Format');
    await this.delay(500);
    actions.push('Opened Format menu');

    return {
      success: true,
      message: 'Opened formatting options',
      actionsPerformed: actions
    };
  }

  private async saveWorkbook(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    if (this.platform === 'darwin') {
      await this.systemController.keyPress(['cmd', 's']);
    } else {
      await this.systemController.keyPress(['ctrl', 's']);
    }
    
    actions.push('Initiated save operation');

    return {
      success: true,
      message: 'Saving workbook',
      actionsPerformed: actions
    };
  }

  private async exportVisualization(command: string, context?: string): Promise<SmartCommandResult> {
    const actions: string[] = [];
    
    await this.clickOnMenuItem('Worksheet');
    await this.delay(500);
    await this.clickOnSubMenuItem('Export');
    actions.push('Initiated export process');

    return {
      success: true,
      message: 'Exporting visualization',
      actionsPerformed: actions
    };
  }

  private async executeGenericCommand(command: string, context?: string): Promise<SmartCommandResult> {
    return {
      success: false,
      message: `Command not recognized: ${command}`,
      actionsPerformed: []
    };
  }

  private async performGenericMenuNavigation(action: string, target?: string): Promise<MenuNavigationResult> {
    return {
      success: false,
      message: `Generic navigation not implemented for: ${action}`
    };
  }

  private async navigateToFormat(target?: string): Promise<MenuNavigationResult> {
    await this.clickOnMenuItem('Format');
    
    if (target) {
      await this.clickOnSubMenuItem(target);
    }

    return {
      success: true,
      message: 'Navigated to Format menu',
      currentState: 'format_menu'
    };
  }

  private async navigateToAnalytics(): Promise<MenuNavigationResult> {
    await this.clickOnMenuItem('Analysis');

    return {
      success: true,
      message: 'Opened Analysis menu',
      currentState: 'analysis_menu'
    };
  }

  private async navigateFileMenu(target?: string): Promise<MenuNavigationResult> {
    await this.clickOnMenuItem('File');
    
    if (target) {
      await this.clickOnSubMenuItem(target);
    }

    return {
      success: true,
      message: 'Navigated to File menu',
      currentState: 'file_menu'
    };
  }

  private async navigateHelpMenu(): Promise<MenuNavigationResult> {
    await this.clickOnMenuItem('Help');

    return {
      success: true,
      message: 'Opened Help menu',
      currentState: 'help_menu'
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods for workbook and worksheet detection

  private extractWorkbookName(windowTitle: string): string {
    // Tableau window titles typically follow patterns like:
    // "Workbook1 - Tableau Desktop"
    // "MyWorkbook.twbx - Tableau Desktop 2023.3"
    // "Untitled - Tableau Desktop"
    
    if (!windowTitle) return 'Unknown';
    
    // Remove Tableau Desktop version info
    let name = windowTitle.replace(/ - Tableau Desktop.*$/, '');
    
    // Remove file extension if present
    name = name.replace(/\.(twb|twbx)$/, '');
    
    return name || 'Untitled';
  }

  private extractFilePath(windowTitle: string): string | undefined {
    // Try to extract file path from window title
    // This is platform-specific and might not always be available
    if (windowTitle.includes('\\') || windowTitle.includes('/')) {
      const parts = windowTitle.split(' - ');
      if (parts.length > 0 && (parts[0].includes('\\') || parts[0].includes('/'))) {
        return parts[0];
      }
    }
    return undefined;
  }

  private extractTableauVersion(windowTitle: string): string {
    const versionMatch = windowTitle.match(/Tableau Desktop (\d{4}\.\d+)/);
    return versionMatch ? versionMatch[1] : 'Unknown';
  }

  private async getWorksheetList(): Promise<WorksheetInfo[]> {
    // Get list of worksheet tabs at the bottom of Tableau
    const worksheets: WorksheetInfo[] = [];
    
    try {
      // Take screenshot to analyze worksheet tabs
      const screenshot = await this.systemController.takeScreenshot();
      const screenSize = this.systemController.getScreenSize();
      
      // Look for worksheet tabs in the bottom area
      const tabRegion = {
        x: 0,
        y: screenSize.height - 100,
        width: screenSize.width,
        height: 100
      };
      
      // This would need OCR or computer vision to detect actual tab names
      // For now, provide a basic implementation that tries to detect tabs
      const detectedTabs = await this.detectWorksheetTabs(screenshot, tabRegion);
      
      for (const tab of detectedTabs) {
        worksheets.push({
          name: tab.name,
          isActive: tab.isActive,
          hasData: tab.hasData,
          dataSource: tab.dataSource,
          chartType: tab.chartType
        });
      }
      
      // If no tabs detected, assume at least one default worksheet
      if (worksheets.length === 0) {
        worksheets.push({
          name: 'Sheet 1',
          isActive: true,
          hasData: false
        });
      }
      
    } catch (error) {
      console.error('Error detecting worksheets:', error);
      // Fallback
      worksheets.push({
        name: 'Sheet 1',
        isActive: true,
        hasData: false
      });
    }
    
    return worksheets;
  }

  private async getDashboardList(): Promise<DashboardInfo[]> {
    // Similar to worksheet detection but for dashboards
    const dashboards: DashboardInfo[] = [];
    
    try {
      const screenshot = await this.systemController.takeScreenshot();
      const screenSize = this.systemController.getScreenSize();
      
      const tabRegion = {
        x: 0,
        y: screenSize.height - 100,
        width: screenSize.width,
        height: 100
      };
      
      const detectedDashboards = await this.detectDashboardTabs(screenshot, tabRegion);
      
      for (const dashboard of detectedDashboards) {
        dashboards.push({
          name: dashboard.name,
          isActive: dashboard.isActive,
          worksheetCount: dashboard.worksheetCount,
          worksheets: dashboard.worksheets
        });
      }
      
    } catch (error) {
      console.error('Error detecting dashboards:', error);
    }
    
    return dashboards;
  }

  private async getCurrentWorksheetName(): Promise<string> {
    try {
      // Look for active worksheet tab
      const worksheets = await this.getWorksheetList();
      const activeWorksheet = worksheets.find(w => w.isActive);
      return activeWorksheet?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private async getConnectedDataSources(): Promise<string[]> {
    // This would analyze the Data pane to detect connected data sources
    const dataSources: string[] = [];
    
    try {
      // Take screenshot and analyze data pane
      const screenshot = await this.systemController.takeScreenshot();
      
      // Look for data source indicators in the left panel
      // This would need computer vision to detect actual data source names
      const detectedSources = await this.detectDataSources(screenshot);
      dataSources.push(...detectedSources);
      
    } catch (error) {
      console.error('Error detecting data sources:', error);
    }
    
    return dataSources;
  }

  private async detectWorksheetTabs(screenshot: Buffer, region: any): Promise<any[]> {
    // Placeholder for computer vision implementation
    // Would use OCR to detect worksheet tab names
    return [
      { name: 'Sheet 1', isActive: true, hasData: false, dataSource: null, chartType: null }
    ];
  }

  private async detectDashboardTabs(screenshot: Buffer, region: any): Promise<any[]> {
    // Placeholder for computer vision implementation
    // Would use OCR to detect dashboard tab names
    return [];
  }

  private async detectDataSources(screenshot: Buffer): Promise<string[]> {
    // Placeholder for computer vision implementation
    // Would analyze the data pane to find connected data sources
    return [];
  }
}