#!/bin/bash

# Tableau MCP Server - Mac Setup Helper
# This script starts the HTTP server and provides Mac configuration instructions

set -e

echo "🚀 Starting Tableau MCP Server for Mac Claude Desktop..."
echo

# Get IP address
LINUX_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo "Unable to determine IP")
PORT=${PORT:-3002}

echo "📡 Linux Machine IP: $LINUX_IP"
echo "🔌 Server Port: $PORT"
echo

# Build if needed
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
    echo
fi

# Update bridge script with current IP
sed -i "s/const LINUX_IP = '[^']*'/const LINUX_IP = '$LINUX_IP'/" tableau-mcp-bridge.js
sed -i "s/const LINUX_PORT = [0-9]*/const LINUX_PORT = $PORT/" tableau-mcp-bridge.js

echo "✅ Updated bridge script with IP: $LINUX_IP and Port: $PORT"
echo

# Check if port is available
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use. Trying to stop existing server..."
    pkill -f "http-server.js" 2>/dev/null || true
    sleep 2
fi

echo "📋 SETUP INSTRUCTIONS FOR YOUR MAC:"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "1. Copy the bridge script to your Mac:"
echo "   scp $(whoami)@$LINUX_IP:$(pwd)/tableau-mcp-bridge.js ~/tableau-mcp-bridge.js"
echo
echo "2. Make it executable on Mac:"
echo "   chmod +x ~/tableau-mcp-bridge.js"
echo
echo "3. Test the bridge on Mac:"
echo "   curl http://$LINUX_IP:$PORT/health"
echo
echo "4. Add this to Claude Desktop config on Mac:"
echo "   File: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo
echo '   {'
echo '     "mcpServers": {'
echo '       "tableau": {'
echo '         "command": "node",'
echo '         "args": ["'$HOME'/tableau-mcp-bridge.js"]'
echo '       }'
echo '     }'
echo '   }'
echo
echo "5. Restart Claude Desktop on Mac"
echo
echo "═══════════════════════════════════════════════════════════════"
echo

# Start the server
echo "🌐 Starting HTTP MCP Server..."
echo "   Server URL: http://$LINUX_IP:$PORT"
echo "   Health Check: http://$LINUX_IP:$PORT/health"
echo "   Tools List: http://$LINUX_IP:$PORT/tools"
echo
echo "📝 Server logs will appear below. Press Ctrl+C to stop."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start server with the specified port
PORT=$PORT npm run start:http