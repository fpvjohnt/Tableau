# Mac Tableau Bridge Setup

This bridge allows Claude Desktop on your Mac M3 to connect to the Tableau MCP server running on Linux (192.168.4.110:3002).

## Architecture

```
Mac M3 (Tableau Desktop 2023.1.10) 
    ↓ (Local detection)
Bridge Script (tableau-mcp-bridge-for-mac.cjs)
    ↓ (Network connection)
Linux Server (192.168.4.110:3002)
    ↓ (MCP Protocol)
Claude Desktop
```

## Updated Features

The bridge script now includes **Mac-specific Tableau detection**:

### Local Mac Tools (Processed on Mac):
- `tableau_detect_current_state` - Detects Tableau Desktop running on Mac
- `tableau_list_workbooks` - Lists open workbooks and worksheets
- `tableau_analyze_interface` - Takes screenshots and analyzes interface

### Remote Tools (Delegated to Linux server):
- `tableau_create_worksheet` - Advanced worksheet creation
- `tableau_create_dashboard` - Dashboard creation
- `tableau_navigate_menu` - Menu navigation
- Other server-side tools

## Setup Instructions

### 1. Copy Bridge Script to Mac
Copy `tableau-mcp-bridge-for-mac.cjs` to your Mac M3 machine.

### 2. Configure Claude Desktop on Mac
Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "tableau-bridge": {
      "command": "node",
      "args": ["/path/to/tableau-mcp-bridge-for-mac.cjs"],
      "env": {}
    }
  }
}
```

### 3. Test Setup

#### On Mac Terminal:
```bash
# Test bridge connectivity
node tableau-mcp-bridge-for-mac.cjs

# In another terminal, send test request:
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tableau_detect_current_state","arguments":{}},"id":1}' | node tableau-mcp-bridge-for-mac.cjs
```

### 4. Verify Tableau Detection

With Tableau Desktop 2023.1.10 open on your Mac:

1. **Process Detection**: Bridge uses `ps aux | grep tableau` to detect Tableau
2. **Window Detection**: Uses AppleScript to get window titles and workbook names  
3. **Worksheet Count**: Attempts UI automation to detect worksheet tabs

## Expected Behavior

### When Tableau is Running:
```json
{
  "success": true,
  "message": "Tableau Desktop state detected on Mac",
  "state": {
    "isTableauOpen": true,
    "activeWorkbook": "EUS OPS Dashboard version 3",
    "activeWorksheet": "Unknown",
    "windowTitle": "EUS OPS Dashboard version 3 - Tableau Desktop",
    "version": "2023.1.10",
    "platform": "darwin"
  }
}
```

### Workbook Listing:
```json
{
  "success": true,
  "message": "Found 1 workbook(s) on Mac",
  "workbooks": [{
    "name": "EUS OPS Dashboard version 3",
    "isActive": true,
    "worksheets": [
      {"name": "Sheet 1", "isActive": true, "hasData": true},
      {"name": "Dashboard 1", "isActive": false, "hasData": true}
    ]
  }],
  "totalWorkbooks": 1
}
```

## Troubleshooting

### Bridge Connection Issues:
1. Verify Linux server is running: `curl http://192.168.4.110:3002/health`
2. Check network connectivity between Mac and Linux
3. Ensure port 3002 is accessible

### Tableau Detection Issues:
1. Verify Tableau Desktop is fully loaded (not splash screen)
2. Check that workbook is open (not just start page)
3. Grant Accessibility permissions to Terminal/Claude Desktop on Mac

### Permission Requirements:
On Mac, you may need to grant permissions for:
- **Accessibility**: For UI automation and window detection
- **Screen Recording**: For screenshot analysis (if used)

## Manual Worksheet Counting

While the bridge attempts automated detection, you can manually count:

1. **Bottom Tabs**: Count worksheet tabs at bottom of Tableau window
2. **Navigator Pane**: Press F2 or Window → Show Navigator
3. **File Menu**: File → Workbook Information for summary

## Current Limitations

- Worksheet detection uses UI automation which may require permissions
- Data source detection requires Tableau API access (not yet implemented)
- Chart type detection is basic (returns 'Unknown')

The bridge provides a foundation for Tableau automation while maintaining the flexibility of the Linux-based MCP server architecture.