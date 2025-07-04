# Tableau MCP Server

An intelligent Model Context Protocol (MCP) server that provides AI-driven control over Tableau Desktop. This server enables Claude Desktop to intelligently interact with Tableau Desktop, creating worksheets, dashboards, and performing advanced data analysis tasks.

## Features

- **Intelligent Worksheet Creation**: Create worksheets with AI guidance based on natural language instructions
- **Smart Dashboard Management**: Build dashboards with automatic layout optimization
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **UI Element Detection**: Advanced computer vision for Tableau interface recognition
- **Natural Language Processing**: Execute complex Tableau operations using conversational commands
- **Menu Navigation**: Intelligent navigation through Tableau's interface
- **Data Source Management**: Connect to various data sources with AI assistance

## Available Tools

### 1. `tableau_create_worksheet`
Create a new worksheet in Tableau with intelligent AI guidance.

**Parameters:**
- `name` (required): Name for the new worksheet
- `dataSource` (optional): Data source to connect to
- `chartType` (optional): Type of visualization (bar, line, scatter, map, etc.)
- `fields` (optional): Array of fields to include in the visualization
- `instructions` (required): Detailed instructions for worksheet creation

**Example:**
```json
{
  "name": "Sales Analysis",
  "chartType": "bar chart",
  "fields": ["Region", "Sales", "Profit"],
  "instructions": "Create a bar chart showing sales by region with profit color coding"
}
```

### 2. `tableau_create_dashboard`
Create a new dashboard with AI-driven layout optimization.

**Parameters:**
- `name` (required): Name for the new dashboard
- `worksheets` (optional): Array of worksheets to include
- `layout` (optional): Dashboard layout style (grid, floating, tiled, story)
- `filters` (optional): Array of global filters to add
- `instructions` (required): Detailed instructions for dashboard creation

**Example:**
```json
{
  "name": "Executive Dashboard",
  "worksheets": ["Sales Analysis", "Profit Trends"],
  "layout": "grid",
  "filters": ["Date Range", "Region"],
  "instructions": "Create an executive dashboard with sales and profit analysis, including interactive filters"
}
```

### 3. `tableau_navigate_menu`
Navigate Tableau menus intelligently with AI awareness.

**Parameters:**
- `action` (required): Menu action to perform
- `target` (optional): Specific menu item or location

**Example:**
```json
{
  "action": "open data menu",
  "target": "New Data Source"
}
```

### 4. `tableau_modify_visualization`
Modify existing visualizations with AI intelligence.

**Parameters:**
- `worksheet` (required): Name of worksheet to modify
- `modifications` (required): Description of changes to make
- `fields` (optional): Fields to add, remove, or modify

### 5. `tableau_connect_data`
Connect to data sources with intelligent assistance.

**Parameters:**
- `sourceType` (required): Type of data source (Excel, CSV, Database, etc.)
- `filePath` (optional): Path to data file
- `connectionString` (optional): Database connection string
- `instructions` (optional): Additional connection instructions

### 6. `tableau_analyze_interface`
Analyze current Tableau interface and provide AI insights.

**Parameters:**
- `focus` (optional): What to analyze (worksheets, data, menus, errors)

### 7. `tableau_smart_actions`
Perform intelligent actions based on natural language commands.

**Parameters:**
- `command` (required): Natural language command for Tableau action
- `context` (optional): Additional context about current state

## Installation

1. **Prerequisites:**
   - Node.js 18 or higher
   - Tableau Desktop installed on your system
   - Claude Desktop application

2. **Build the server:**
   ```bash
   npm install
   npm run build
   ```

3. **Configure Claude Desktop:**
   Add the server configuration to your Claude Desktop settings. Copy the contents of `claude_desktop_config.json` to your Claude Desktop MCP configuration.

   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows:** `%APPDATA%\\Claude\\claude_desktop_config.json`
   **Linux:** `~/.config/Claude/claude_desktop_config.json`

4. **Optional: Install RobotJS for enhanced automation:**
   ```bash
   # On Ubuntu/Debian:
   sudo apt-get install libxtst6 libxinerama1 libx11-dev libxinerama-dev libxtst-dev
   npm install robotjs
   
   # On macOS:
   # RobotJS should install without issues
   
   # On Windows:
   # Install Visual Studio Build Tools and Windows SDK
   ```

## Usage Examples

### Creating a Sales Dashboard

```javascript
// First, create a worksheet
await tableau_create_worksheet({
  name: "Monthly Sales",
  chartType: "line chart",
  fields: ["Order Date", "Sales"],
  instructions: "Create a line chart showing sales trends over time by month"
});

// Then create a dashboard
await tableau_create_dashboard({
  name: "Sales Dashboard",
  worksheets: ["Monthly Sales"],
  layout: "tiled",
  instructions: "Create a clean dashboard with the monthly sales trend and add date filters"
});
```

### Analyzing Data

```javascript
// Connect to data source
await tableau_connect_data({
  sourceType: "Excel",
  filePath: "/path/to/sales_data.xlsx",
  instructions: "Connect to the sales data spreadsheet"
});

// Analyze current interface
await tableau_analyze_interface({
  focus: "data"
});

// Execute smart actions
await tableau_smart_actions({
  command: "Create a bar chart showing top 10 customers by sales",
  context: "We have customer and sales data loaded"
});
```

## System Requirements

- **Operating System:** Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Memory:** 4GB RAM minimum, 8GB recommended
- **Storage:** 500MB free space
- **Tableau Desktop:** Any recent version (2019.1 or later recommended)
- **Node.js:** Version 18.0.0 or higher

## Troubleshooting

### Common Issues

1. **"Could not find Tableau Desktop"**
   - Ensure Tableau Desktop is installed and accessible from PATH
   - Try launching Tableau manually first

2. **"RobotJS not available"**
   - This is normal if RobotJS isn't installed
   - The server will use platform-specific fallback methods
   - Install RobotJS for better performance (see installation instructions)

3. **"Permission denied" errors**
   - On macOS: Grant accessibility permissions to Terminal/Claude Desktop
   - On Linux: Ensure X11 forwarding is enabled if using remote desktop

4. **Interface detection issues**
   - Make sure Tableau Desktop is the active window
   - Ensure sufficient screen resolution (1920x1080 minimum recommended)
   - Check that UI scaling is set to 100% for best results

### Debug Mode

To run the server in debug mode:

```bash
NODE_ENV=development npm run dev
```

This will provide detailed logging of all operations.

## Contributing

This MCP server demonstrates advanced AI-driven automation capabilities. Contributions are welcome for:

- Enhanced UI detection algorithms
- Additional Tableau features support
- Cross-platform compatibility improvements
- Performance optimizations

## License

MIT License - See LICENSE file for details.

## Security Notice

This server automates Tableau Desktop by simulating user interactions. Only use with trusted data sources and in secure environments. The server does not collect or transmit any data from your Tableau workbooks.