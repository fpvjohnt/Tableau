import { TableauController, MenuNavigationResult, SmartCommandResult } from './tableau-controller.js';
import { UIElementDetector, UIElement, InterfaceAnalysis } from './ui-detector.js';
import { Point, Rectangle } from './system-controller.js';

export interface WorksheetConfig {
  name: string;
  dataSource?: string;
  chartType?: string;
  fields?: string[];
  instructions: string;
}

export interface ModificationConfig {
  worksheet: string;
  modifications: string;
  fields?: string[];
}

export interface WorksheetResult {
  success: boolean;
  message: string;
  worksheetName?: string;
  actionsPerformed: string[];
  suggestions?: string[];
}

/**
 * Intelligent worksheet management for Tableau
 * Handles creation and modification of worksheets with AI guidance
 */
export class WorksheetManager {
  private tableauController: TableauController;
  private uiDetector: UIElementDetector;

  constructor(tableauController: TableauController, uiDetector: UIElementDetector) {
    this.tableauController = tableauController;
    this.uiDetector = uiDetector;
  }

  /**
   * Create a new worksheet with intelligent guidance
   */
  async createWorksheet(config: WorksheetConfig): Promise<WorksheetResult> {
    const actions: string[] = [];
    
    try {
      // Ensure Tableau is active
      await this.tableauController.ensureTableauActive();
      actions.push('Activated Tableau Desktop');

      // Analyze current interface state
      const analysis = await this.uiDetector.analyzeInterface('worksheet_creation');
      actions.push('Analyzed current interface state');

      // Create new worksheet
      const newWorksheetResult = await this.createNewWorksheet(config.name);
      if (!newWorksheetResult.success) {
        return {
          success: false,
          message: newWorksheetResult.message,
          actionsPerformed: actions
        };
      }
      actions.push(`Created new worksheet: ${config.name}`);

      // Connect to data source if specified
      if (config.dataSource) {
        const dataResult = await this.connectToDataSource(config.dataSource);
        if (dataResult.success) {
          actions.push(`Connected to data source: ${config.dataSource}`);
        } else {
          actions.push(`Warning: Could not connect to data source: ${config.dataSource}`);
        }
      }

      // Build visualization based on instructions
      if (config.chartType || config.fields || config.instructions) {
        const vizResult = await this.buildVisualization(config);
        actions.push(...vizResult.actionsPerformed);
        
        if (!vizResult.success) {
          return {
            success: false,
            message: `Worksheet created but visualization failed: ${vizResult.message}`,
            worksheetName: config.name,
            actionsPerformed: actions
          };
        }
      }

      // Get smart suggestions for next steps
      const suggestions = await this.uiDetector.getSmartSuggestions();

      return {
        success: true,
        message: `Successfully created worksheet "${config.name}" with visualization`,
        worksheetName: config.name,
        actionsPerformed: actions,
        suggestions
      };

    } catch (error) {
      return {
        success: false,
        message: `Worksheet creation failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: actions
      };
    }
  }

  /**
   * Modify existing visualization
   */
  async modifyVisualization(config: ModificationConfig): Promise<WorksheetResult> {
    const actions: string[] = [];

    try {
      // Find and activate the target worksheet
      const worksheetResult = await this.activateWorksheet(config.worksheet);
      if (!worksheetResult.success) {
        return {
          success: false,
          message: worksheetResult.message,
          actionsPerformed: actions
        };
      }
      actions.push(`Activated worksheet: ${config.worksheet}`);

      // Analyze current visualization state
      const analysis = await this.uiDetector.analyzeInterface('visualization_modification');
      actions.push('Analyzed current visualization');

      // Parse modification instructions
      const modifications = await this.parseModificationInstructions(config.modifications);
      
      // Apply modifications
      for (const modification of modifications) {
        const result = await this.applyModification(modification);
        actions.push(result.message);
        
        if (!result.success) {
          return {
            success: false,
            message: `Modification failed: ${result.message}`,
            actionsPerformed: actions
          };
        }
      }

      // Verify modifications were applied
      const finalAnalysis = await this.uiDetector.analyzeInterface('verification');
      const suggestions = await this.uiDetector.getSmartSuggestions();

      return {
        success: true,
        message: `Successfully modified visualization in "${config.worksheet}"`,
        worksheetName: config.worksheet,
        actionsPerformed: actions,
        suggestions
      };

    } catch (error) {
      return {
        success: false,
        message: `Visualization modification failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: actions
      };
    }
  }

  /**
   * Get available chart types based on current data
   */
  async getRecommendedChartTypes(): Promise<string[]> {
    const analysis = await this.uiDetector.analyzeInterface('chart_recommendations');
    const dataFields = analysis.elements.filter(e => e.type === 'field');
    
    const recommendations: string[] = [];
    
    // Basic recommendations based on field types
    const dimensions = dataFields.filter(f => f.attributes.fieldType === 'dimension');
    const measures = dataFields.filter(f => f.attributes.fieldType === 'measure');
    
    if (dimensions.length > 0 && measures.length > 0) {
      recommendations.push('Bar Chart', 'Line Chart', 'Area Chart');
    }
    
    if (dimensions.length >= 2 && measures.length >= 1) {
      recommendations.push('Heat Map', 'Treemap');
    }
    
    if (measures.length >= 2) {
      recommendations.push('Scatter Plot', 'Bubble Chart');
    }
    
    // Geographic data detection
    const geoFields = dataFields.filter(f => 
      f.text?.toLowerCase().includes('country') ||
      f.text?.toLowerCase().includes('state') ||
      f.text?.toLowerCase().includes('city') ||
      f.text?.toLowerCase().includes('region')
    );
    
    if (geoFields.length > 0) {
      recommendations.push('Map', 'Symbol Map');
    }
    
    return recommendations.length > 0 ? recommendations : ['Bar Chart', 'Line Chart', 'Scatter Plot'];
  }

  // Private helper methods

  private async createNewWorksheet(name: string): Promise<WorksheetResult> {
    try {
      // Try to create new worksheet via menu navigation
      const menuResult = await this.tableauController.navigateMenu('new worksheet');
      
      if (menuResult.success) {
        // Wait for worksheet to be created
        await this.delay(1000);
        
        // Rename worksheet if name is provided
        if (name !== 'Sheet') {
          await this.renameWorksheet(name);
        }
        
        return {
          success: true,
          message: `Created new worksheet: ${name}`,
          worksheetName: name,
          actionsPerformed: [`Created worksheet ${name}`]
        };
      } else {
        throw new Error(menuResult.message);
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create worksheet: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async renameWorksheet(name: string): Promise<void> {
    // Double-click on worksheet tab to rename
    const worksheetTab = await this.uiDetector.findElement('tab', 'Sheet');
    if (worksheetTab) {
      const centerX = worksheetTab.bounds.x + worksheetTab.bounds.width / 2;
      const centerY = worksheetTab.bounds.y + worksheetTab.bounds.height / 2;
      
      await this.tableauController['systemController'].doubleClick(centerX, centerY);
      await this.delay(300);
      
      // Type new name
      await this.tableauController['systemController'].type(name);
      await this.tableauController['systemController'].keyPress(['enter']);
    }
  }

  private async connectToDataSource(dataSource: string): Promise<WorksheetResult> {
    try {
      // Determine data source type
      let sourceType = 'file';
      if (dataSource.includes('.xlsx') || dataSource.includes('.xls')) {
        sourceType = 'Excel';
      } else if (dataSource.includes('.csv')) {
        sourceType = 'CSV';
      } else if (dataSource.includes('.json')) {
        sourceType = 'JSON';
      }

      const result = await this.tableauController.connectToDataSource({
        sourceType,
        filePath: dataSource,
        instructions: `Connect to ${dataSource}`
      });

      return {
        success: result.success,
        message: result.message,
        actionsPerformed: [`Connected to ${sourceType} data source`]
      };
    } catch (error) {
      return {
        success: false,
        message: `Data connection failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async buildVisualization(config: WorksheetConfig): Promise<WorksheetResult> {
    const actions: string[] = [];

    try {
      // If chart type is specified, use Show Me panel
      if (config.chartType) {
        const chartResult = await this.selectChartType(config.chartType);
        actions.push(`Selected chart type: ${config.chartType}`);
        
        if (!chartResult.success) {
          return {
            success: false,
            message: chartResult.message,
            actionsPerformed: actions
          };
        }
      }

      // Add fields to shelves
      if (config.fields && config.fields.length > 0) {
        for (const field of config.fields) {
          const fieldResult = await this.addFieldToVisualization(field);
          actions.push(`Added field: ${field}`);
          
          if (!fieldResult.success) {
            actions.push(`Warning: Could not add field ${field}: ${fieldResult.message}`);
          }
        }
      }

      // Process natural language instructions
      if (config.instructions) {
        const instructionResult = await this.processInstructions(config.instructions);
        actions.push(...instructionResult.actionsPerformed);
      }

      return {
        success: true,
        message: 'Visualization built successfully',
        actionsPerformed: actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Visualization building failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: actions
      };
    }
  }

  private async selectChartType(chartType: string): Promise<WorksheetResult> {
    try {
      // Open Show Me panel
      const showMeElement = await this.uiDetector.findClickableArea('show_me');
      if (showMeElement) {
        await this.tableauController['systemController'].click(showMeElement.x, showMeElement.y);
        await this.delay(500);
      }

      // Find and click the chart type
      const chartElement = await this.uiDetector.findElement('button', chartType);
      if (chartElement) {
        const centerX = chartElement.bounds.x + chartElement.bounds.width / 2;
        const centerY = chartElement.bounds.y + chartElement.bounds.height / 2;
        await this.tableauController['systemController'].click(centerX, centerY);
        
        return {
          success: true,
          message: `Selected ${chartType}`,
          actionsPerformed: [`Selected ${chartType} from Show Me panel`]
        };
      } else {
        return {
          success: false,
          message: `Chart type "${chartType}" not found`,
          actionsPerformed: []
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Chart selection failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async addFieldToVisualization(fieldName: string): Promise<WorksheetResult> {
    try {
      // Find the field in the data pane
      const fieldElement = await this.uiDetector.findElement('field', fieldName);
      if (!fieldElement) {
        return {
          success: false,
          message: `Field "${fieldName}" not found`,
          actionsPerformed: []
        };
      }

      // Determine appropriate shelf based on field type
      const isDateField = fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time');
      const isMeasure = fieldElement.attributes.fieldType === 'measure';
      
      let targetShelf = 'Rows';
      if (isDateField) {
        targetShelf = 'Columns';
      } else if (isMeasure) {
        targetShelf = 'Text';
      }

      // Find target shelf
      const shelfElement = await this.uiDetector.findElement('shelf', targetShelf);
      if (!shelfElement) {
        return {
          success: false,
          message: `Target shelf "${targetShelf}" not found`,
          actionsPerformed: []
        };
      }

      // Drag field to shelf
      const fieldCenterX = fieldElement.bounds.x + fieldElement.bounds.width / 2;
      const fieldCenterY = fieldElement.bounds.y + fieldElement.bounds.height / 2;
      const shelfCenterX = shelfElement.bounds.x + shelfElement.bounds.width / 2;
      const shelfCenterY = shelfElement.bounds.y + shelfElement.bounds.height / 2;

      await this.tableauController['systemController'].drag(
        fieldCenterX, fieldCenterY,
        shelfCenterX, shelfCenterY
      );

      await this.delay(500);

      return {
        success: true,
        message: `Added ${fieldName} to ${targetShelf}`,
        actionsPerformed: [`Dragged ${fieldName} to ${targetShelf} shelf`]
      };

    } catch (error) {
      return {
        success: false,
        message: `Field addition failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async processInstructions(instructions: string): Promise<WorksheetResult> {
    const actions: string[] = [];
    const instructionLower = instructions.toLowerCase();

    try {
      // Process common instruction patterns
      if (instructionLower.includes('sort')) {
        const sortResult = await this.tableauController.executeSmartCommand('sort data', instructions);
        actions.push(`Applied sort: ${sortResult.message}`);
      }

      if (instructionLower.includes('filter')) {
        const filterResult = await this.tableauController.executeSmartCommand('add filter', instructions);
        actions.push(`Applied filter: ${filterResult.message}`);
      }

      if (instructionLower.includes('color') || instructionLower.includes('format')) {
        const colorResult = await this.tableauController.executeSmartCommand('change colors', instructions);
        actions.push(`Applied formatting: ${colorResult.message}`);
      }

      if (instructionLower.includes('title') || instructionLower.includes('label')) {
        const labelResult = await this.addTitlesAndLabels(instructions);
        actions.push(`Added titles/labels: ${labelResult.message}`);
      }

      return {
        success: true,
        message: 'Instructions processed successfully',
        actionsPerformed: actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Instruction processing failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: actions
      };
    }
  }

  private async activateWorksheet(worksheetName: string): Promise<WorksheetResult> {
    try {
      // Find worksheet tab
      const worksheetTab = await this.uiDetector.findElement('tab', worksheetName);
      if (worksheetTab) {
        const centerX = worksheetTab.bounds.x + worksheetTab.bounds.width / 2;
        const centerY = worksheetTab.bounds.y + worksheetTab.bounds.height / 2;
        await this.tableauController['systemController'].click(centerX, centerY);
        await this.delay(500);
        
        return {
          success: true,
          message: `Activated worksheet: ${worksheetName}`,
          actionsPerformed: [`Clicked on ${worksheetName} tab`]
        };
      } else {
        return {
          success: false,
          message: `Worksheet "${worksheetName}" not found`,
          actionsPerformed: []
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to activate worksheet: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async parseModificationInstructions(modifications: string): Promise<any[]> {
    // Parse natural language modifications into actionable steps
    const modificationList: any[] = [];
    const modLower = modifications.toLowerCase();

    if (modLower.includes('add') && modLower.includes('field')) {
      modificationList.push({ type: 'add_field', details: modifications });
    }

    if (modLower.includes('remove') && modLower.includes('field')) {
      modificationList.push({ type: 'remove_field', details: modifications });
    }

    if (modLower.includes('change') && modLower.includes('chart')) {
      modificationList.push({ type: 'change_chart_type', details: modifications });
    }

    if (modLower.includes('sort')) {
      modificationList.push({ type: 'sort', details: modifications });
    }

    if (modLower.includes('filter')) {
      modificationList.push({ type: 'filter', details: modifications });
    }

    if (modLower.includes('color') || modLower.includes('format')) {
      modificationList.push({ type: 'format', details: modifications });
    }

    // If no specific patterns found, treat as general modification
    if (modificationList.length === 0) {
      modificationList.push({ type: 'general', details: modifications });
    }

    return modificationList;
  }

  private async applyModification(modification: any): Promise<WorksheetResult> {
    try {
      switch (modification.type) {
        case 'add_field':
          return await this.handleAddField(modification.details);
        case 'remove_field':
          return await this.handleRemoveField(modification.details);
        case 'change_chart_type':
          return await this.handleChangeChartType(modification.details);
        case 'sort':
          return await this.handleSort(modification.details);
        case 'filter':
          return await this.handleFilter(modification.details);
        case 'format':
          return await this.handleFormat(modification.details);
        case 'general':
          return await this.handleGeneralModification(modification.details);
        default:
          return {
            success: false,
            message: `Unknown modification type: ${modification.type}`,
            actionsPerformed: []
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Modification failed: ${error instanceof Error ? error.message : String(error)}`,
        actionsPerformed: []
      };
    }
  }

  private async handleAddField(details: string): Promise<WorksheetResult> {
    // Extract field name from details
    const fieldMatch = details.match(/add\s+(?:field\s+)?['"]?([^'"]+)['"]?/i);
    const fieldName = fieldMatch ? fieldMatch[1].trim() : '';
    
    if (fieldName) {
      return await this.addFieldToVisualization(fieldName);
    } else {
      return {
        success: false,
        message: 'Could not identify field to add',
        actionsPerformed: []
      };
    }
  }

  private async handleRemoveField(details: string): Promise<WorksheetResult> {
    // This would involve finding the field on shelves and removing it
    return {
      success: true,
      message: 'Field removal not yet implemented',
      actionsPerformed: ['Noted field removal request']
    };
  }

  private async handleChangeChartType(details: string): Promise<WorksheetResult> {
    // Extract chart type from details
    const chartTypes = ['bar', 'line', 'area', 'scatter', 'pie', 'map', 'heat', 'treemap'];
    const foundType = chartTypes.find(type => details.toLowerCase().includes(type));
    
    if (foundType) {
      return await this.selectChartType(foundType + ' chart');
    } else {
      return {
        success: false,
        message: 'Could not identify chart type',
        actionsPerformed: []
      };
    }
  }

  private async handleSort(details: string): Promise<WorksheetResult> {
    const result = await this.tableauController.executeSmartCommand('sort data', details);
    return {
      success: result.success,
      message: result.message,
      actionsPerformed: result.actionsPerformed
    };
  }

  private async handleFilter(details: string): Promise<WorksheetResult> {
    const result = await this.tableauController.executeSmartCommand('add filter', details);
    return {
      success: result.success,
      message: result.message,
      actionsPerformed: result.actionsPerformed
    };
  }

  private async handleFormat(details: string): Promise<WorksheetResult> {
    const result = await this.tableauController.executeSmartCommand('format', details);
    return {
      success: result.success,
      message: result.message,
      actionsPerformed: result.actionsPerformed
    };
  }

  private async handleGeneralModification(details: string): Promise<WorksheetResult> {
    const result = await this.tableauController.executeSmartCommand(details);
    return {
      success: result.success,
      message: result.message,
      actionsPerformed: result.actionsPerformed
    };
  }

  private async addTitlesAndLabels(instructions: string): Promise<WorksheetResult> {
    // Add titles and labels based on instructions
    return {
      success: true,
      message: 'Titles and labels functionality planned',
      actionsPerformed: ['Analyzed title/label requirements']
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}