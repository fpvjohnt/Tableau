#!/usr/bin/env node

const http = require('http');
const process = require('process');

// CONFIGURATION - Update these values for your setup
const LINUX_IP = '192.168.6.26';  // Replace with your Linux machine's IP
const LINUX_PORT = 3001;           // Replace with your chosen port

class MCPBridge {
  constructor() {
    console.error(`Tableau MCP Bridge starting - connecting to ${LINUX_IP}:${LINUX_PORT}`);
    this.setupStdio();
  }

  setupStdio() {
    process.stdin.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        console.error(`Received request: ${request.method}`);
        
        const response = await this.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        console.error(`Error handling request: ${error.message}`);
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          error: { 
            code: -32603, 
            message: error.message 
          },
          id: null
        }) + '\n');
      }
    });

    process.stdin.on('end', () => {
      console.error('stdin ended, exiting');
      process.exit(0);
    });

    console.error('MCP Bridge ready for requests');
  }

  async handleRequest(request) {
    if (request.method === 'initialize') {
      console.error('Initializing MCP connection');
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { 
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'tableau-mcp-server',
            version: '1.0.0'
          }
        },
        id: request.id
      };
    }

    if (request.method === 'tools/list') {
      console.error('Fetching tools list');
      const tools = await this.fetchTools();
      return {
        jsonrpc: '2.0',
        result: { tools },
        id: request.id
      };
    }

    if (request.method === 'tools/call') {
      console.error(`Calling tool: ${request.params.name}`);
      const result = await this.callTool(request.params.name, request.params.arguments);
      return {
        jsonrpc: '2.0',
        result: {
          content: [{ 
            type: 'text', 
            text: result.message || JSON.stringify(result, null, 2)
          }],
          isError: !result.success
        },
        id: request.id
      };
    }

    throw new Error(`Unknown method: ${request.method}`);
  }

  async fetchTools() {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${LINUX_IP}:${LINUX_PORT}/tools`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.error(`Fetched ${response.tools.length} tools`);
            resolve(response.tools);
          } catch (e) {
            console.error(`Error parsing tools response: ${e.message}`);
            reject(e);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`Error fetching tools: ${error.message}`);
        reject(error);
      });

      req.setTimeout(10000, () => {
        console.error('Timeout fetching tools');
        req.destroy();
        reject(new Error('Timeout fetching tools'));
      });
    });
  }

  async callTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(args || {});
      
      const options = {
        hostname: LINUX_IP,
        port: LINUX_PORT,
        path: `/execute/${toolName}`,
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
            console.error(`Tool ${toolName} completed: ${response.success ? 'success' : 'failure'}`);
            resolve(response);
          } catch (e) {
            console.error(`Error parsing tool response: ${e.message}`);
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`Error calling tool ${toolName}: ${error.message}`);
        reject(error);
      });

      req.setTimeout(30000, () => {
        console.error(`Timeout calling tool ${toolName}`);
        req.destroy();
        reject(new Error(`Timeout calling tool ${toolName}`));
      });

      req.write(postData);
      req.end();
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the bridge
new MCPBridge();