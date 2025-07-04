# Remote Setup: Linux Server → Mac Claude Desktop

This guide explains how to connect your Tableau MCP server running on Linux to Claude Desktop on your Mac.

## Quick Setup (Recommended)

### 1. Start the HTTP Server on Linux

On your Linux machine, start the HTTP-based MCP server:

```bash
cd /home/jtapia/test-claude/tableau-mcp-server

# Build the project
npm run build

# Start the HTTP server (default port 3001)
PORT=3001 npm run start:http

# Or specify a custom port
PORT=8080 npm run start:http
```

The server will show:
```
Tableau HTTP MCP Server running on http://0.0.0.0:3001
Health check: http://0.0.0.0:3001/health
Tools list: http://0.0.0.0:3001/tools
```

### 2. Get Your Linux IP Address

Find your Linux machine's IP address:

```bash
# Option 1: Get local network IP
ip route get 1.1.1.1 | awk '{print $7; exit}'

# Option 2: Alternative method
hostname -I | awk '{print $1}'

# Option 3: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

Example output: `192.168.1.100`

### 3. Test the Connection from Mac

From your Mac, test that you can reach the server:

```bash
# Replace with your Linux IP and port
curl http://192.168.1.100:3001/health

# Expected response:
# {"status":"healthy","server":"tableau-mcp-server","version":"1.0.0","timestamp":"..."}
```

### 4. Create HTTP-to-MCP Bridge on Mac

Since Claude Desktop expects MCP protocol over stdio, create a bridge script on your Mac:

Create `/Users/yourusername/tableau-mcp-bridge.js`:

```javascript
#!/usr/bin/env node

const http = require('http');
const process = require('process');

const LINUX_IP = '192.168.1.100';  // Replace with your Linux IP
const LINUX_PORT = 3001;           // Replace with your port

class MCPBridge {
  constructor() {
    this.setupStdio();
  }

  setupStdio() {
    process.stdin.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        const response = await this.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: error.message },
          id: null
        }) + '\n');
      }
    });
  }

  async handleRequest(request) {
    if (request.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} }
        },
        id: request.id
      };
    }

    if (request.method === 'tools/list') {
      const tools = await this.fetchTools();
      return {
        jsonrpc: '2.0',
        result: { tools },
        id: request.id
      };
    }

    if (request.method === 'tools/call') {
      const result = await this.callTool(request.params.name, request.params.arguments);
      return {
        jsonrpc: '2.0',
        result: {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        },
        id: request.id
      };
    }

    throw new Error(\`Unknown method: \${request.method}\`);
  }

  async fetchTools() {
    return new Promise((resolve, reject) => {
      const req = http.get(\`http://\${LINUX_IP}:\${LINUX_PORT}/tools\`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.tools);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
    });
  }

  async callTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(args);
      
      const options = {
        hostname: LINUX_IP,
        port: LINUX_PORT,
        path: \`/execute/\${toolName}\`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

new MCPBridge();
```

Make it executable:
```bash
chmod +x /Users/yourusername/tableau-mcp-bridge.js
```

### 5. Configure Claude Desktop on Mac

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tableau": {
      "command": "node",
      "args": ["/Users/yourusername/tableau-mcp-bridge.js"]
    }
  }
}
```

### 6. Restart Claude Desktop

Quit and restart Claude Desktop on your Mac. You should now see the Tableau tools available!

## Alternative Setup Methods

### Option A: SSH Tunnel

If you prefer SSH, you can tunnel the connection:

1. **On Mac**, create an SSH tunnel:
```bash
ssh -L 3001:localhost:3001 username@your-linux-ip
```

2. **Configure Claude Desktop** to use localhost:
```json
{
  "mcpServers": {
    "tableau": {
      "command": "ssh",
      "args": [
        "username@your-linux-ip",
        "cd /home/jtapia/test-claude/tableau-mcp-server && node dist/index.js"
      ]
    }
  }
}
```

### Option B: Direct SSH Execution

Configure Claude Desktop to run the MCP server via SSH:

```json
{
  "mcpServers": {
    "tableau": {
      "command": "ssh",
      "args": [
        "-t",
        "username@your-linux-ip",
        "cd /home/jtapia/test-claude/tableau-mcp-server && node dist/index.js"
      ]
    }
  }
}
```

## Testing Your Setup

### 1. Test HTTP Server Health

```bash
curl http://YOUR_LINUX_IP:3001/health
```

Should return:
```json
{"status":"healthy","server":"tableau-mcp-server","version":"1.0.0"}
```

### 2. Test Available Tools

```bash
curl http://YOUR_LINUX_IP:3001/tools
```

Should return a list of 7 Tableau tools.

### 3. Test Tool Execution

```bash
curl -X POST http://YOUR_LINUX_IP:3001/execute/tableau_analyze_interface \
  -H "Content-Type: application/json" \
  -d '{"focus": "general"}'
```

### 4. Test in Claude Desktop

Open Claude Desktop and try:

> "Use the Tableau tools to analyze the current interface"

You should see the Tableau MCP server responding!

## Network Configuration

### Firewall Settings

Make sure port 3001 (or your chosen port) is open on your Linux machine:

```bash
# Ubuntu/Debian
sudo ufw allow 3001

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# Check if port is listening
ss -tlnp | grep :3001
```

### Security Considerations

For production use, consider:

1. **VPN Connection**: Use a VPN between your Mac and Linux machine
2. **Authentication**: Add API keys or tokens to the bridge script
3. **HTTPS**: Use a reverse proxy with SSL certificates
4. **Firewall Rules**: Restrict access to your Mac's IP only

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if the server is running: `ps aux | grep tableau`
   - Verify the port: `ss -tlnp | grep :3001`
   - Test locally on Linux: `curl localhost:3001/health`

2. **Bridge Script Errors**
   - Check the IP and port in the bridge script
   - Test the bridge: `echo '{"method":"tools/list","id":1}' | node tableau-mcp-bridge.js`

3. **Claude Desktop Not Finding Tools**
   - Restart Claude Desktop completely
   - Check the config file path and JSON syntax
   - Look at Claude Desktop logs for error messages

4. **Tableau Not Launching**
   - Make sure Tableau Desktop is installed on the Linux machine
   - Check that X11 forwarding works if using SSH display
   - Verify display environment: `echo $DISPLAY`

### Debug Mode

Run the server with debug logging:

```bash
NODE_ENV=development PORT=3001 npm run start:http
```

### Advanced Debugging

Monitor HTTP requests:

```bash
# On Linux, monitor server logs
tail -f /var/log/syslog | grep tableau

# On Mac, test with verbose curl
curl -v http://YOUR_LINUX_IP:3001/tools
```

## Performance Tips

1. **Keep Connections Alive**: The HTTP server keeps connections open for better performance
2. **Local Network**: Use wired ethernet for best responsiveness
3. **Close Unused Apps**: Close unnecessary applications on both machines
4. **Monitor Resources**: Watch CPU and memory usage during Tableau automation

## Success! 🎉

Once everything is working, you can:

- Create Tableau worksheets from Claude Desktop
- Build dashboards with natural language commands
- Analyze data and get AI insights
- Automate complex Tableau workflows

Example commands to try in Claude Desktop:
- "Create a sales dashboard with regional breakdown"
- "Analyze the current Tableau interface and suggest improvements"
- "Connect to an Excel file and create a bar chart"
- "Modify the existing visualization to show trends over time"