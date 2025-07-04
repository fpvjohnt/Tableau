#!/bin/bash

###############################################
# macOS Tableau Desktop MCP Bridge Setup     #
# Prerequisite verification and testing      #
###############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍎 macOS Tableau Desktop MCP Bridge Setup${NC}"
echo "=============================================="
echo

# === STEP 0: Prerequisite Checks ===
echo -e "${YELLOW}📋 Step 0: Checking Prerequisites...${NC}"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is for macOS only${NC}"
    echo "Current OS: $OSTYPE"
    exit 1
fi
echo -e "${GREEN}✅ Running on macOS${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found in PATH${NC}"
    echo "Please install Node.js ≥ 18 from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old${NC}"
    echo "Please upgrade to Node.js ≥ 18"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $NODE_VERSION (≥ 18)${NC}"

# Check if Tableau Desktop is installed
TABLEAU_PATHS=(
    "/Applications/Tableau Desktop 2023.1.app"
    "/Applications/Tableau Desktop 2023.2.app"
    "/Applications/Tableau Desktop 2023.3.app"
    "/Applications/Tableau Desktop 2024.1.app"
    "/Applications/Tableau Desktop.app"
)

TABLEAU_FOUND=false
TABLEAU_PATH=""

for path in "${TABLEAU_PATHS[@]}"; do
    if [ -d "$path" ]; then
        TABLEAU_FOUND=true
        TABLEAU_PATH="$path"
        break
    fi
done

if [ "$TABLEAU_FOUND" = false ]; then
    echo -e "${RED}❌ Tableau Desktop not found${NC}"
    echo "Expected locations:"
    for path in "${TABLEAU_PATHS[@]}"; do
        echo "  $path"
    done
    exit 1
fi
echo -e "${GREEN}✅ Tableau Desktop found: $TABLEAU_PATH${NC}"

# Check if Tableau is currently running
if pgrep -f "Tableau" > /dev/null; then
    echo -e "${GREEN}✅ Tableau Desktop is running${NC}"
else
    echo -e "${YELLOW}⚠️  Tableau Desktop is not running${NC}"
    echo "Please open Tableau Desktop with a workbook before testing"
fi

# === STEP 1: Accessibility Permissions Check ===
echo
echo -e "${YELLOW}🔒 Step 1: Checking Accessibility Permissions...${NC}"

# Check if Terminal/iTerm has accessibility permissions
ACCESSIBILITY_CHECK=$(osascript -e '
try
    tell application "System Events"
        set frontmostApplication to name of first application process whose frontmost is true
        return "OK"
    end tell
on error
    return "ERROR"
end try
' 2>/dev/null || echo "ERROR")

if [ "$ACCESSIBILITY_CHECK" = "ERROR" ]; then
    echo -e "${RED}❌ Accessibility permissions not granted${NC}"
    echo 
    echo "To fix this:"
    echo "1. Open System Preferences → Security & Privacy → Privacy"
    echo "2. Click on 'Accessibility' in the left sidebar"
    echo "3. Click the lock icon and enter your password"
    echo "4. Add Terminal (or iTerm2) to the list"
    echo "5. Make sure it's checked/enabled"
    echo 
    echo "Then run this script again."
    exit 1
fi
echo -e "${GREEN}✅ Accessibility permissions granted${NC}"

# === STEP 2: Install Dependencies ===
echo
echo -e "${YELLOW}📦 Step 2: Installing Dependencies...${NC}"

# Check if package.json exists, create if needed
if [ ! -f "package.json" ]; then
    echo "Creating package.json..."
    cat > package.json <<'EOF'
{
  "name": "tableau-desktop-bridge",
  "version": "1.0.0",
  "description": "MCP bridge for Tableau Desktop automation on macOS",
  "main": "tableau-bridge-minimal.js",
  "scripts": {
    "test": "node tableau-bridge-minimal.js --test",
    "start": "node tableau-bridge-minimal.js"
  },
  "dependencies": {},
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
fi

# Make the bridge script executable
chmod +x tableau-bridge-minimal.js

# === STEP 3: Test Detection ===
echo
echo -e "${YELLOW}🧪 Step 3: Testing Tableau Detection...${NC}"

if [ ! -f "tableau-bridge-minimal.js" ]; then
    echo -e "${RED}❌ tableau-bridge-minimal.js not found${NC}"
    echo "Please make sure the bridge script is in the current directory"
    exit 1
fi

echo "Running detection test..."
TEST_RESULT=$(node tableau-bridge-minimal.js --test 2>&1)
TEST_EXIT_CODE=$?

echo "$TEST_RESULT"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo
    echo -e "${GREEN}✅ Detection test passed!${NC}"
else
    echo
    echo -e "${RED}❌ Detection test failed${NC}"
    echo
    echo "Common fixes:"
    echo "• Make sure Tableau Desktop is open"
    echo "• Open a workbook (not just the start page)"
    echo "• Grant Accessibility permissions (see step 1 above)"
    echo "• Try restarting Tableau Desktop"
    exit 1
fi

# === STEP 4: Claude Desktop Integration ===
echo
echo -e "${YELLOW}🔗 Step 4: Setting up Claude Desktop Integration...${NC}"

# Create Claude config directory
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CLAUDE_CONFIG_DIR"

# Get absolute path to current directory
CURRENT_DIR=$(pwd)

# Create or update Claude Desktop config
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "Backing up existing Claude config..."
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%s)"
fi

cat > "$CLAUDE_CONFIG_FILE" <<EOF
{
  "mcpServers": {
    "tableau-desktop": {
      "command": "node",
      "args": ["$CURRENT_DIR/tableau-bridge-minimal.js"],
      "env": {
        "NODE_PATH": "$CURRENT_DIR"
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ Claude Desktop configuration updated${NC}"

# === STEP 5: Final Instructions ===
echo
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="
echo
echo -e "${YELLOW}Next steps:${NC}"
echo
echo "1. 🔄 Restart Claude Desktop:"
echo "   pkill -f 'Claude' && sleep 3 && open -a 'Claude Desktop'"
echo
echo "2. 📊 Test in Claude Desktop:"
echo "   • Ask: 'Detect current Tableau state'"
echo "   • Ask: 'List worksheets and dashboards'"
echo "   • Ask: 'Create a new worksheet called Test Sheet'"
echo
echo "3. 🛠️  Manual testing commands:"
echo "   node tableau-bridge-minimal.js --test    # Test detection"
echo
echo -e "${YELLOW}Available MCP tools:${NC}"
echo "• tableau_detect_state - Check what's currently open"
echo "• tableau_list_sheets - List all worksheets/dashboards"  
echo "• tableau_new_worksheet - Create new worksheet"
echo "• tableau_new_dashboard - Create new dashboard"
echo "• tableau_add_calculated_field - Add calculated fields"
echo
echo -e "${YELLOW}Data schema available:${NC}"
echo "• Avaya call data with KPIs"
echo "• Incident/Request/Chat data (group & tech views)"
echo "• Manager lookup tables"
echo "• Pre-built worksheet templates"
echo "• Business KPI formulas"
echo
echo -e "${BLUE}📋 Troubleshooting:${NC}"
echo "• If detection fails: Check Accessibility permissions"
echo "• If Claude can't connect: Restart Claude Desktop"
echo "• If scripts fail: Make sure Tableau has a workbook open"
echo
echo -e "${GREEN}✨ Ready to automate Tableau Desktop with Claude!${NC}"