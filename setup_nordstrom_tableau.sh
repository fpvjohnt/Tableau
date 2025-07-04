#!/bin/bash

###############################################
# Claude Code – Tableau MCP Server setup    #
# For Nordstrom Tableau Server              #
###############################################

set -e

echo "🚀 Setting up Nordstrom Tableau MCP Server..."

# 🐍 1-A. Create Python virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

# 🐍 1-B. Install requirements
echo "📚 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 🔑 1-C. Create .env file template (DO NOT commit secrets!)
if [ ! -f .env ]; then
    echo "🔐 Creating .env file template..."
    cat > .env <<'EOF'
# --- Tableau authentication (Okta SSO via Personal Access Token) ---
TABLEAU_SERVER_URL=https://tableau.nordstrom.com
TABLEAU_SITE_ID=technology-support-services
TABLEAU_TOKEN_NAME=cli-bridge
TABLEAU_TOKEN_VALUE=PA-12345-REPLACE-WITH-YOUR-ACTUAL-PAT

# --- Networking (Zscaler) ---
HTTPS_PROXY=http://gateway.zscaler.net:80
NO_PROXY=localhost,127.0.0.1
EOF
    chmod 600 .env
    echo "⚠️  IMPORTANT: Edit .env and add your actual Personal Access Token!"
    echo "   1. Go to tableau.nordstrom.com"
    echo "   2. Click your profile > My Account Settings"
    echo "   3. Create a new Personal Access Token"
    echo "   4. Replace 'PA-12345-REPLACE-WITH-YOUR-ACTUAL-PAT' in .env"
else
    echo "✅ .env file already exists"
fi

# 🚀 1-D. Test connection
echo "🧪 Testing Tableau Server connection..."
if python tableau_mcp_server.py --test; then
    echo "✅ Connection test successful!"
else
    echo "❌ Connection test failed. Please check your .env configuration."
    echo "   Make sure you've added your Personal Access Token to .env"
    exit 1
fi

#################################################
# 2) Hook the server into Claude Desktop (Mac) #
#################################################

echo "🔗 Setting up Claude Desktop integration..."

# Create Claude config directory
mkdir -p "$HOME/Library/Application Support/Claude"

# Get current directory for absolute path
CURRENT_DIR=$(pwd)

# Create Claude Desktop config
cat > "$HOME/Library/Application Support/Claude/claude_desktop_config.json" <<EOF
{
  "mcpServers": {
    "tableau-nordstrom": {
      "command": "$CURRENT_DIR/.venv/bin/python",
      "args": ["$CURRENT_DIR/tableau_mcp_server.py"]
    }
  }
}
EOF

echo "✅ Claude Desktop configuration updated"

#########################################
# 3) Final checks & instructions       #
#########################################

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. 🔐 IMPORTANT: Add your Personal Access Token to .env:"
echo "   nano .env"
echo ""
echo "2. 🔄 Restart Claude Desktop:"
echo "   pkill -f 'Claude' && sleep 4 && open -a 'Claude Desktop'"
echo ""
echo "3. 📊 Test in Claude Desktop:"
echo "   Ask: 'List all workbooks on tableau.nordstrom.com'"
echo ""
echo "4. 📋 View logs (in separate terminal):"
echo "   tail -f ~/Library/Logs/Claude/mcp-server-tableau-nordstrom.log"
echo ""
echo "Available commands:"
echo "  • List all workbooks"
echo "  • List all data sources" 
echo "  • Get workbook details for [workbook name]"
echo "  • Search for workbooks containing [term]"
echo "  • Test Tableau Server connection"
echo ""
echo "🔧 Manual test:"
echo "   python tableau_mcp_server.py --test"
echo ""

# Set permissions
chmod +x tableau_mcp_server.py
chmod 600 .env 2>/dev/null || true

echo "✨ Ready to use with Claude Desktop!"