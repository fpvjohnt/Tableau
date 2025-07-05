# Mac Quick Setup Guide

## 🚀 Quick Start (5 minutes)

After downloading this project to your Mac:

### 1. Run the Setup Script
```bash
cd tableau-mcp-server
./setup-macos-tableau.sh
```

This will:
- ✅ Check Node.js ≥ 18
- ✅ Find Tableau Desktop
- ✅ Test AppleScript permissions
- ✅ Configure Claude Desktop
- ✅ Test everything works

### 2. If Setup Fails

**Missing Node.js:**
```bash
# Install Node.js 18+ from https://nodejs.org
# Or use Homebrew:
brew install node
```

**Missing Accessibility Permissions:**
1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Click **Accessibility**
3. Add **Terminal** (or **iTerm2**)
4. Check the box to enable

**Tableau Not Found:**
- Install Tableau Desktop 2023.1+
- Make sure it's in `/Applications/`

### 3. Test Installation

```bash
# Test detection
node tableau-mcp-server.js --test

# Test template creator  
./tableau-template-creator.js list-templates
```

### 4. Use with Claude Desktop

After setup completes, restart Claude Desktop:
```bash
pkill -f "Claude" && sleep 3 && open -a "Claude Desktop"
```

Then ask Claude:
- "Detect current Tableau state"
- "Create a new worksheet called 'Test'"
- "List available KPI templates"

## 📋 What You Get

- **Direct MCP Server** - No bridge needed, runs locally
- **Tableau Desktop Automation** - Create worksheets/dashboards  
- **Business KPIs** - MTTR, SLA compliance, call metrics
- **Data Schema** - Avaya, incident/chat data, manager lookup
- **Templates** - Pre-built analysis worksheets
- **Calculated Fields** - Automated business formulas

## 🔧 Troubleshooting

**"Detection failed":**
- Open Tableau Desktop
- Load a workbook (not start page)
- Grant Accessibility permissions

**"Claude can't connect":**
- Restart Claude Desktop
- Check `~/Library/Application Support/Claude/claude_desktop_config.json`

**"AppleScript errors":**
- Run: `osascript -e 'tell application "System Events" to return name of first process'`
- If fails: Grant Accessibility permissions

## 🎯 Success Check

✅ Setup script completes without errors  
✅ Detection test shows your workbook  
✅ Claude Desktop shows "tableau-desktop" server  
✅ Can create worksheets through Claude  

Ready to automate Tableau with Claude! 🚀