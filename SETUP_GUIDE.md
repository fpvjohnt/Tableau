# Tableau MCP Server & Desktop Bridge

Complete MCP (Model Context Protocol) integration for Tableau Server and Desktop automation.

## 🚀 Quick Start (macOS Desktop)

```bash
./setup-macos-tableau.sh
```

This script will:
- ✅ Verify Node.js ≥ 18 and macOS
- ✅ Check Tableau Desktop installation  
- ✅ Verify Accessibility permissions
- ✅ Test Tableau detection
- ✅ Configure Claude Desktop integration

## 📋 Prerequisites

- **macOS** (tested on macOS 12+)
- **Node.js ≥ 18** in PATH
- **Tableau Desktop** (2023.1+ recommended)
- **Accessibility permissions** for Terminal/iTerm2
- **Claude Desktop** installed

## 🛠️ Manual Setup

If the automatic setup fails, follow these steps:

### 1. Grant Accessibility Permissions

1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Accessibility** from the left sidebar
3. Click the lock icon and enter your password
4. Add **Terminal** (or **iTerm2**) to the list
5. Ensure it's **checked/enabled**

### 2. Test Detection

```bash
node tableau-bridge-minimal.js --test
```

Expected output:
```json
{
  "success": true,
  "message": "Tableau Desktop detected",
  "workbook": "EUS OPS Dashboard version 3",
  "worksheets": [...],
  "dashboards": [...]
}
```

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tableau-desktop": {
      "command": "node",
      "args": ["/full/path/to/tableau-bridge-minimal.js"]
    }
  }
}
```

## 🎯 Available MCP Tools

### Core Detection
- `tableau_detect_state` - Check current Tableau state
- `tableau_list_sheets` - List worksheets and dashboards

### Creation Tools  
- `tableau_new_worksheet` - Create new worksheet
- `tableau_new_dashboard` - Create new dashboard
- `tableau_add_calculated_field` - Add calculated fields

### Template Tools
Use the template creator for advanced automation:

```bash
# List available templates
./tableau-template-creator.js list-templates

# Create worksheet from template
./tableau-template-creator.js create inc_trend

# Create KPI dashboard
./tableau-template-creator.js create-kpi-dashboard
```

## 📊 Data Schema & Templates

The system includes comprehensive data schema from your environment:

### Data Sources
- **Avaya** - Call records with wait times, talk times
- **INC/REQ/Chat (Group)** - Incident/request data by group
- **INC/REQ/Chat (Tech)** - Detailed tech performance data  
- **Managers** - Manager lookup and hierarchy
- **ServiceNow** - Call record integration

### Pre-built Templates
- **Incident Trend** - Monthly volume analysis
- **Burn Rate Analysis** - Open vs closed comparison
- **MTTR Distribution** - Resolution time analysis
- **Chat Performance** - Duration and volume metrics
- **SLA Dashboard** - On-time resolution tracking

### Business KPIs
- MTTR (Mean Time to Resolution)
- SLA Compliance Rate
- Ticket Volume
- Chat Utilization  
- Call Answer Rate

## 🔧 Troubleshooting

### Detection Issues
```bash
# Check if Tableau is running
pgrep -f "Tableau"

# Test AppleScript access
osascript -e 'tell application "System Events" to return name of first process'
```

### Common Fixes
- **"AppleScript failed"** → Grant Accessibility permissions
- **"No windows"** → Open a workbook (not start page)
- **"Not running"** → Launch Tableau Desktop
- **Claude can't connect** → Restart Claude Desktop

### Debug Mode
```bash
# Run with verbose output
node tableau-bridge-minimal.js --test 2>&1

# Check Claude Desktop logs
tail -f ~/Library/Logs/Claude/mcp-server-tableau-desktop.log
```

## 🌐 Tableau Server (Nordstrom)

For Nordstrom Tableau Server integration:

```bash
./setup_nordstrom_tableau.sh
```

This configures:
- Okta SSO with Personal Access Token
- Zscaler proxy support
- Server API integration
- Workbook/data source listing

## 📝 Usage Examples

### In Claude Desktop

**Detection:**
```
"Detect current Tableau state"
"List all worksheets and dashboards"
```

**Creation:**
```  
"Create a new worksheet called 'Weekly Metrics'"
"Add a calculated field for MTTR in hours"
"Create a dashboard for executive summary"
```

**Templates:**
```
"Create an incident trend worksheet"
"Build a KPI dashboard with all business metrics"
"Generate MTTR analysis from template"
```

## 🔒 Security

- Never commit `.env` files with tokens
- Accessibility permissions are required for automation
- All scripts run locally on your machine
- No data is transmitted to external services

## 🐛 Known Issues

- **AppleScript Parsing**: Complex worksheet names may cause parsing issues
- **Timing Sensitivity**: Some operations require delays for UI responsiveness  
- **Version Compatibility**: Tested on Tableau Desktop 2023.1+
- **Accessibility**: Requires explicit permission grants on macOS

## 📞 Support

If you encounter issues:

1. Run the diagnostic: `./setup-macos-tableau.sh` 
2. Check the troubleshooting section above
3. Verify all prerequisites are met
4. Test with a simple workbook first

## 🎉 Success Indicators

You'll know everything is working when:

- ✅ Detection test passes
- ✅ Claude Desktop shows "tableau-desktop" MCP server
- ✅ You can ask Claude to detect Tableau state
- ✅ Worksheet/dashboard creation works
- ✅ Calculated fields are added successfully

Ready to automate your Tableau workflows with Claude! 🚀