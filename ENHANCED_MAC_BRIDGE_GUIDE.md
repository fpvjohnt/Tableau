# Enhanced Mac Tableau Bridge - Complete Guide

## 🎯 **What's New**

The bridge script has been completely enhanced with advanced Tableau detection and automation capabilities for your Mac M3 + Tableau Desktop 2023.1.10 setup.

## 🔧 **Enhanced Capabilities**

### **Detailed Detection**
- ✅ **Workbook Name**: Extracts actual workbook name from window title
- ✅ **Active Worksheet**: Detects currently active worksheet/dashboard
- ✅ **All Worksheets**: Enumerates all worksheet tabs
- ✅ **All Dashboards**: Detects and lists dashboard tabs  
- ✅ **Data Sources**: Scans Data pane for connected data sources
- ✅ **Version Info**: Identifies Tableau Desktop version

### **Creation Capabilities**
- ✅ **New Worksheets**: Create worksheets via UI automation
- ✅ **New Dashboards**: Create dashboards via menu/shortcuts
- ✅ **Tab Management**: Right-click context menus
- ✅ **Keyboard Shortcuts**: Fallback automation methods

## 📋 **Setup Instructions**

### 1. **Mac Permissions Required**
```bash
# Grant Accessibility permissions to:
System Preferences > Security & Privacy > Privacy > Accessibility
✅ Terminal (if running from terminal)
✅ Claude Desktop (when using MCP)
✅ Script Editor (for AppleScript)
```

### 2. **Copy Enhanced Bridge Script**
Copy the updated `tableau-mcp-bridge-for-mac.cjs` to your Mac M3.

### 3. **Configure Claude Desktop**
Update your MCP configuration:
```json
{
  "mcpServers": {
    "tableau-enhanced": {
      "command": "node",
      "args": ["/path/to/tableau-mcp-bridge-for-mac.cjs"],
      "env": {}
    }
  }
}
```

## 🧪 **Testing Enhanced Detection**

### **Test 1: Basic Detection**
With your "EUS OPS Dashboard version 3" open in Tableau:

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tableau_detect_current_state","arguments":{}},"id":1}' | node tableau-mcp-bridge-for-mac.cjs
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Tableau Desktop state detected on Mac",
  "state": {
    "isTableauOpen": true,
    "activeWorkbook": "EUS OPS Dashboard version 3",
    "activeWorksheet": "[Current Sheet Name]",
    "connectedDataSources": ["[Your Data Sources]"],
    "windowTitle": "EUS OPS Dashboard version 3 - Tableau Desktop",
    "version": "2023.1.10"
  }
}
```

### **Test 2: Detailed Workbook Analysis**
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tableau_list_workbooks","arguments":{"includeDetails":true}},"id":2}' | node tableau-mcp-bridge-for-mac.cjs
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Found 1 workbook(s) on Mac with detailed information",
  "workbooks": [{
    "name": "EUS OPS Dashboard version 3",
    "isActive": true,
    "worksheets": [
      {"name": "Sheet 1", "isActive": true, "hasData": true, "type": "worksheet"},
      {"name": "Analysis", "isActive": false, "hasData": true, "type": "worksheet"}
    ],
    "dashboards": [
      {"name": "Dashboard 1", "isActive": false, "type": "dashboard"}
    ],
    "dataSources": ["Your Connected Data"],
    "totalSheets": 3
  }],
  "totalWorksheets": 2,
  "totalDashboards": 1
}
```

### **Test 3: Create New Worksheet**
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tableau_create_worksheet","arguments":{"name":"Sales Analysis","instructions":"Create worksheet for sales data visualization"}},"id":3}' | node tableau-mcp-bridge-for-mac.cjs
```

## 🔍 **Troubleshooting Enhanced Detection**

### **Issue: "Unknown" Worksheets/Data Sources**
**Cause**: AppleScript UI access limitations
**Solutions**:
1. Grant full Accessibility permissions
2. Ensure Tableau is frontmost application
3. Check that workbook is fully loaded (not start page)

### **Issue: Worksheet Creation Fails**
**Cause**: UI automation permissions or timing
**Solutions**:
1. Verify Accessibility permissions for Terminal/Claude Desktop
2. Ensure Tableau Desktop has focus
3. Try manual creation first to verify UI responsiveness

### **Issue: Data Source Detection Empty**
**Cause**: Data pane structure varies by Tableau version
**Solutions**:
1. Ensure Data pane is visible (not collapsed)
2. Try connecting to a simple data source first
3. Check that data connection is established

## 📊 **What You Should See Now**

### **For "EUS OPS Dashboard version 3":**

1. **Workbook Detection**: ✅ Actual workbook name instead of "Unknown"
2. **Worksheet Count**: ✅ Actual count of your worksheet tabs
3. **Dashboard Detection**: ✅ Lists your dashboard tabs separately  
4. **Data Sources**: ✅ Shows connected data sources from Data pane
5. **Active Sheet**: ✅ Identifies currently selected worksheet/dashboard

### **Creation Capabilities:**
- **New Worksheets**: Creates via right-click menu or Worksheet menu
- **New Dashboards**: Creates via Dashboard menu or Cmd+Shift+D
- **Error Handling**: Graceful fallbacks if UI automation fails

## 🚀 **Advanced Usage**

### **Automated Workflow Example:**
```javascript
// 1. Detect current state
await tableau_detect_current_state()

// 2. List all content  
await tableau_list_workbooks(true)

// 3. Create new analysis worksheet
await tableau_create_worksheet({
  name: "Monthly Sales Analysis", 
  instructions: "Create worksheet for monthly sales trends"
})

// 4. Create dashboard
await tableau_create_dashboard({
  name: "Executive Dashboard",
  instructions: "Combine key worksheets for executive view"
})
```

## 📝 **Current Limitations & Next Steps**

### **Working Now:**
- ✅ Workbook name detection
- ✅ Worksheet/dashboard enumeration
- ✅ Data source listing
- ✅ Basic creation automation

### **Still Limited:**
- 🔄 Calculated field creation (requires deeper UI automation)
- 🔄 Field-to-shelf automation (complex drag/drop)
- 🔄 Chart type detection (requires visual analysis)

### **Recommended Manual Steps:**
For complex operations, the bridge can now:
1. **Detect** your current workbook structure accurately
2. **Create** new worksheets and dashboards
3. **Provide context** for manual field manipulation
4. **Guide** you through optimal workflow steps

The enhanced bridge gives you full visibility into your "EUS OPS Dashboard version 3" structure and can automate the creation of new analysis components while you handle the detailed field work manually.