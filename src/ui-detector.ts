import { SystemController, Point, Rectangle } from './system-controller.js';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface UIElement {
  type: string;
  bounds: Rectangle;
  text?: string;
  confidence: number;
  attributes: { [key: string]: any };
}

export interface InterfaceAnalysis {
  elements: UIElement[];
  summary: string;
  recommendations: string[];
  currentContext: string;
  availableActions: string[];
}

/**
 * Intelligent UI element detection for Tableau interface
 * Uses computer vision and AI to understand Tableau's current state
 */
export class UIElementDetector {
  private systemController: SystemController;
  private cachedElements: Map<string, UIElement[]> = new Map();
  private lastScreenshot: Buffer | null = null;
  private lastAnalysis: InterfaceAnalysis | null = null;

  constructor(systemController: SystemController) {
    this.systemController = systemController;
  }

  /**
   * Analyze current Tableau interface and provide AI insights
   */
  async analyzeInterface(focus: string = 'general'): Promise<InterfaceAnalysis> {
    const screenshot = await this.systemController.takeScreenshot();
    this.lastScreenshot = screenshot;

    const elements = await this.detectUIElements(screenshot);
    const context = await this.determineContext(elements);
    const summary = await this.generateSummary(elements, context, focus);
    const recommendations = await this.generateRecommendations(elements, context);
    const availableActions = await this.getAvailableActions(elements, context);

    const analysis: InterfaceAnalysis = {
      elements,
      summary,
      recommendations,
      currentContext: context,
      availableActions
    };

    this.lastAnalysis = analysis;
    return analysis;
  }

  /**
   * Detect UI elements in screenshot using computer vision
   */
  async detectUIElements(screenshot: Buffer): Promise<UIElement[]> {
    const elements: UIElement[] = [];

    try {
      // Use multiple detection methods
      const menuElements = await this.detectMenus(screenshot);
      const panelElements = await this.detectPanels(screenshot);
      const fieldElements = await this.detectFields(screenshot);
      const buttonElements = await this.detectButtons(screenshot);
      const textElements = await this.detectText(screenshot);
      const visualizationElements = await this.detectVisualizations(screenshot);

      elements.push(...menuElements);
      elements.push(...panelElements);
      elements.push(...fieldElements);
      elements.push(...buttonElements);
      elements.push(...textElements);
      elements.push(...visualizationElements);

      return this.filterAndRankElements(elements);
    } catch (error) {
      console.error('UI detection error:', error);
      return [];
    }
  }

  /**
   * Find specific UI element by type and text
   */
  async findElement(type: string, text?: string, attributes?: any): Promise<UIElement | null> {
    if (!this.lastAnalysis) {
      await this.analyzeInterface();
    }

    const elements = this.lastAnalysis?.elements || [];
    
    return elements.find(element => {
      if (element.type !== type) return false;
      if (text && element.text !== text) return false;
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          if (element.attributes[key] !== value) return false;
        }
      }
      return true;
    }) || null;
  }

  /**
   * Find clickable area for a specific action
   */
  async findClickableArea(action: string): Promise<Point | null> {
    const actionMap: { [key: string]: string[] } = {
      'new_worksheet': ['new worksheet', 'worksheet', '+'],
      'new_dashboard': ['new dashboard', 'dashboard', '+'],
      'data_source': ['data source', 'connect', 'data'],
      'show_me': ['show me', 'charts'],
      'analytics': ['analytics', 'analytics pane'],
      'format': ['format', 'formatting'],
      'file_menu': ['file'],
      'data_menu': ['data'],
      'worksheet_menu': ['worksheet'],
      'dashboard_menu': ['dashboard'],
      'analysis_menu': ['analysis'],
      'map_menu': ['map'],
      'format_menu': ['format'],
      'server_menu': ['server'],
      'window_menu': ['window'],
      'help_menu': ['help']
    };

    const searchTerms = actionMap[action] || [action];
    
    for (const term of searchTerms) {
      const element = await this.findElement('button', term) ||
                     await this.findElement('menu', term) ||
                     await this.findElement('text', term);
      
      if (element) {
        return {
          x: element.bounds.x + element.bounds.width / 2,
          y: element.bounds.y + element.bounds.height / 2
        };
      }
    }

    return null;
  }

  /**
   * Detect tableau-specific UI patterns
   */
  async detectTableauPatterns(): Promise<{ [key: string]: UIElement[] }> {
    if (!this.lastAnalysis) {
      await this.analyzeInterface();
    }

    const elements = this.lastAnalysis?.elements || [];
    const patterns: { [key: string]: UIElement[] } = {
      dataPanes: [],
      shelves: [],
      worksheetTabs: [],
      showMePanel: [],
      analyticsPane: [],
      formatPane: [],
      visualizationArea: []
    };

    for (const element of elements) {
      if (this.isDataPane(element)) {
        patterns.dataPanes.push(element);
      } else if (this.isShelf(element)) {
        patterns.shelves.push(element);
      } else if (this.isWorksheetTab(element)) {
        patterns.worksheetTabs.push(element);
      } else if (this.isShowMePanel(element)) {
        patterns.showMePanel.push(element);
      } else if (this.isAnalyticsPane(element)) {
        patterns.analyticsPane.push(element);
      } else if (this.isFormatPane(element)) {
        patterns.formatPane.push(element);
      } else if (this.isVisualizationArea(element)) {
        patterns.visualizationArea.push(element);
      }
    }

    return patterns;
  }

  /**
   * Get smart suggestions based on current interface state
   */
  async getSmartSuggestions(): Promise<string[]> {
    if (!this.lastAnalysis) {
      await this.analyzeInterface();
    }

    const context = this.lastAnalysis?.currentContext || '';
    const elements = this.lastAnalysis?.elements || [];
    const suggestions: string[] = [];

    // Context-based suggestions
    if (context.includes('empty_worksheet')) {
      suggestions.push('Connect to a data source to begin analysis');
      suggestions.push('Drag fields to shelves to create visualizations');
      suggestions.push('Use Show Me panel for quick chart types');
    } else if (context.includes('data_connected')) {
      suggestions.push('Drag dimensions to Rows or Columns');
      suggestions.push('Add measures to create visualizations');
      suggestions.push('Apply filters to focus your analysis');
    } else if (context.includes('visualization_created')) {
      suggestions.push('Format your visualization for better presentation');
      suggestions.push('Add analytics features like trend lines');
      suggestions.push('Create calculated fields for advanced analysis');
    } else if (context.includes('dashboard')) {
      suggestions.push('Arrange worksheets for optimal layout');
      suggestions.push('Add global filters for interactivity');
      suggestions.push('Include legends and titles for clarity');
    }

    // Element-based suggestions
    const dataFields = elements.filter(e => e.type === 'field');
    if (dataFields.length > 0) {
      suggestions.push(`${dataFields.length} data fields available for analysis`);
    }

    const emptySlots = elements.filter(e => e.attributes.isEmpty);
    if (emptySlots.length > 0) {
      suggestions.push('Drop fields into empty shelves to build visualizations');
    }

    return suggestions;
  }

  // Private detection methods

  private async detectMenus(screenshot: Buffer): Promise<UIElement[]> {
    // Detect menu bar and menu items
    const elements: UIElement[] = [];
    
    // Menu bar is typically at the top of the application
    const screenSize = this.systemController.getScreenSize();
    const menuBarRegion: Rectangle = {
      x: 0,
      y: 0,
      width: screenSize.width,
      height: 30
    };

    // Mock menu detection - in real implementation would use OCR/computer vision
    const menuItems = ['File', 'Data', 'Worksheet', 'Dashboard', 'Analysis', 'Map', 'Format', 'Server', 'Window', 'Help'];
    
    for (let i = 0; i < menuItems.length; i++) {
      elements.push({
        type: 'menu',
        bounds: {
          x: i * 80 + 10,
          y: 5,
          width: 70,
          height: 20
        },
        text: menuItems[i],
        confidence: 0.9,
        attributes: {
          isTopLevel: true,
          hasSubmenu: true
        }
      });
    }

    return elements;
  }

  private async detectPanels(screenshot: Buffer): Promise<UIElement[]> {
    const elements: UIElement[] = [];
    const screenSize = this.systemController.getScreenSize();

    // Data pane (typically left side)
    elements.push({
      type: 'panel',
      bounds: {
        x: 0,
        y: 30,
        width: 250,
        height: screenSize.height - 130
      },
      text: 'Data Pane',
      confidence: 0.85,
      attributes: {
        panelType: 'data',
        isCollapsible: true,
        contains: ['dimensions', 'measures', 'parameters']
      }
    });

    // Analytics pane (if visible)
    elements.push({
      type: 'panel',
      bounds: {
        x: 0,
        y: 30,
        width: 250,
        height: screenSize.height - 130
      },
      text: 'Analytics Pane',
      confidence: 0.75,
      attributes: {
        panelType: 'analytics',
        isCollapsible: true,
        contains: ['summarize', 'model', 'custom']
      }
    });

    // Show Me panel (typically right side)
    elements.push({
      type: 'panel',
      bounds: {
        x: screenSize.width - 200,
        y: 30,
        width: 200,
        height: 300
      },
      text: 'Show Me',
      confidence: 0.8,
      attributes: {
        panelType: 'showme',
        isCollapsible: true,
        contains: ['chart_types']
      }
    });

    return elements;
  }

  private async detectFields(screenshot: Buffer): Promise<UIElement[]> {
    const elements: UIElement[] = [];
    
    // Mock field detection - would use actual computer vision
    const mockFields = [
      { name: 'Order Date', type: 'dimension', x: 20, y: 80 },
      { name: 'Sales', type: 'measure', x: 20, y: 100 },
      { name: 'Profit', type: 'measure', x: 20, y: 120 },
      { name: 'Category', type: 'dimension', x: 20, y: 140 },
      { name: 'Region', type: 'dimension', x: 20, y: 160 }
    ];

    for (const field of mockFields) {
      elements.push({
        type: 'field',
        bounds: {
          x: field.x,
          y: field.y,
          width: 200,
          height: 18
        },
        text: field.name,
        confidence: 0.9,
        attributes: {
          fieldType: field.type,
          isDraggable: true,
          dataType: field.type === 'measure' ? 'numeric' : 'categorical'
        }
      });
    }

    return elements;
  }

  private async detectButtons(screenshot: Buffer): Promise<UIElement[]> {
    const elements: UIElement[] = [];
    
    // Common Tableau buttons
    const buttons = [
      { text: 'Connect to Data', x: 400, y: 200, width: 120, height: 30 },
      { text: 'New Worksheet', x: 50, y: 600, width: 100, height: 25 },
      { text: 'Show Me', x: 1000, y: 50, width: 80, height: 25 }
    ];

    for (const button of buttons) {
      elements.push({
        type: 'button',
        bounds: button,
        text: button.text,
        confidence: 0.85,
        attributes: {
          isClickable: true,
          action: button.text.toLowerCase().replace(/\s+/g, '_')
        }
      });
    }

    return elements;
  }

  private async detectText(screenshot: Buffer): Promise<UIElement[]> {
    // OCR detection would go here
    // For now, return mock text elements
    return [];
  }

  private async detectVisualizations(screenshot: Buffer): Promise<UIElement[]> {
    const elements: UIElement[] = [];
    const screenSize = this.systemController.getScreenSize();

    // Visualization area (center of screen)
    elements.push({
      type: 'visualization',
      bounds: {
        x: 250,
        y: 100,
        width: screenSize.width - 450,
        height: screenSize.height - 200
      },
      text: 'Visualization Area',
      confidence: 0.8,
      attributes: {
        hasData: false,
        chartType: 'none',
        isEmpty: true
      }
    });

    return elements;
  }

  private filterAndRankElements(elements: UIElement[]): UIElement[] {
    // Filter out low-confidence elements and rank by importance
    return elements
      .filter(e => e.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 100); // Limit to top 100 elements
  }

  private async determineContext(elements: UIElement[]): Promise<string> {
    const contexts: string[] = [];

    // Check for data connection
    const hasDataFields = elements.some(e => e.type === 'field');
    if (!hasDataFields) {
      contexts.push('no_data_connected');
    } else {
      contexts.push('data_connected');
    }

    // Check for active visualization
    const vizArea = elements.find(e => e.type === 'visualization');
    if (vizArea?.attributes.isEmpty) {
      contexts.push('empty_worksheet');
    } else {
      contexts.push('visualization_created');
    }

    // Check for dashboard context
    const isDashboard = elements.some(e => e.text?.includes('Dashboard'));
    if (isDashboard) {
      contexts.push('dashboard');
    }

    return contexts.join('_');
  }

  private async generateSummary(elements: UIElement[], context: string, focus: string): Promise<string> {
    const elementCounts = elements.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    let summary = `Tableau Interface Analysis:\n`;
    summary += `- Context: ${context.replace(/_/g, ' ')}\n`;
    summary += `- Focus: ${focus}\n`;
    summary += `- Elements detected: ${elements.length}\n`;
    
    for (const [type, count] of Object.entries(elementCounts)) {
      summary += `  - ${type}: ${count}\n`;
    }

    if (context.includes('no_data_connected')) {
      summary += `\nNo data source detected. Ready to connect to data.`;
    } else if (context.includes('empty_worksheet')) {
      summary += `\nData connected but no visualization created yet.`;
    } else if (context.includes('visualization_created')) {
      summary += `\nActive visualization detected. Ready for analysis or formatting.`;
    }

    return summary;
  }

  private async generateRecommendations(elements: UIElement[], context: string): Promise<string[]> {
    const recommendations: string[] = [];

    if (context.includes('no_data_connected')) {
      recommendations.push('Connect to a data source to begin analysis');
      recommendations.push('Use File > Open to open an existing workbook');
    } else if (context.includes('empty_worksheet')) {
      recommendations.push('Drag fields from the Data pane to create visualizations');
      recommendations.push('Use the Show Me panel for quick chart recommendations');
      recommendations.push('Start with dimensions on Rows/Columns and measures on Text/Color');
    } else if (context.includes('visualization_created')) {
      recommendations.push('Format your visualization for better presentation');
      recommendations.push('Add filters to enable interactivity');
      recommendations.push('Consider adding trend lines or reference lines');
      recommendations.push('Create a dashboard to combine multiple visualizations');
    }

    if (context.includes('dashboard')) {
      recommendations.push('Arrange worksheets for optimal layout');
      recommendations.push('Add global filters for dashboard interactivity');
      recommendations.push('Include legends and titles for clarity');
    }

    return recommendations;
  }

  private async getAvailableActions(elements: UIElement[], context: string): Promise<string[]> {
    const actions: string[] = [];

    // Always available actions
    actions.push('Connect to data source');
    actions.push('Create new worksheet');
    actions.push('Create new dashboard');
    actions.push('Open Show Me panel');

    if (context.includes('data_connected')) {
      actions.push('Create calculated field');
      actions.push('Create parameter');
      actions.push('Modify data source');
    }

    if (context.includes('visualization_created')) {
      actions.push('Format visualization');
      actions.push('Add analytics features');
      actions.push('Export visualization');
      actions.push('Duplicate worksheet');
    }

    const clickableElements = elements.filter(e => e.attributes.isClickable);
    for (const element of clickableElements) {
      if (element.attributes.action) {
        actions.push(element.attributes.action);
      }
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  // Helper methods for pattern recognition

  private isDataPane(element: UIElement): boolean {
    return element.type === 'panel' && element.attributes.panelType === 'data';
  }

  private isShelf(element: UIElement): boolean {
    return element.type === 'shelf' || (element.type === 'panel' && (element.text?.includes('shelf') || false));
  }

  private isWorksheetTab(element: UIElement): boolean {
    return element.type === 'tab' || (element.bounds.y > 500 && element.bounds.height < 30);
  }

  private isShowMePanel(element: UIElement): boolean {
    return (element.text?.toLowerCase().includes('show me') || false) || element.attributes.panelType === 'showme';
  }

  private isAnalyticsPane(element: UIElement): boolean {
    return element.attributes.panelType === 'analytics';
  }

  private isFormatPane(element: UIElement): boolean {
    return element.attributes.panelType === 'format' || (element.text?.toLowerCase().includes('format') || false);
  }

  private isVisualizationArea(element: UIElement): boolean {
    return element.type === 'visualization';
  }
}