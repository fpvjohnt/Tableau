#!/usr/bin/env node

const http = require('http');
const process = require('process');

// CONFIGURATION - Update these values for your setup
const LINUX_IP = '127.0.0.1';  // Replace with your Linux machine's IP
const LINUX_PORT = 3002;           // Replace with your chosen port

class MCPBridge {
  constructor() {
    console.error(`Tableau MCP Bridge starting - connecting to ${LINUX_IP}:${LINUX_PORT}`);
    this.setupStdio();
  }

  setupStdio() {
    let buffer = '';
    
    process.stdin.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete JSON-RPC messages
      let lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      console.error('stdin ended, exiting');
      process.exit(0);
    });

    console.error('MCP Bridge ready for requests');
  }

  async handleMessage(messageStr) {
    try {
      const request = JSON.parse(messageStr);
      console.error(`Received request: ${JSON.stringify(request)}`);
      
      const response = await this.handleRequest(request);
      console.error(`Sending response: ${JSON.stringify(response)}`);
      
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      console.error(`Error handling message: ${error.message}`);
      
      // Send proper error response
      const errorResponse = {
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: error.message 
        },
        id: null
      };
      
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  }

  async handleRequest(request) {
    // Ensure we have required fields
    if (!request.jsonrpc) {
      request.jsonrpc = '2.0';
    }
    
    const id = request.id || null;
    
    try {
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
          id: id
        };
      }

      if (request.method === 'initialized') {
        console.error('MCP initialized notification received');
        // No response needed for notifications
        return null;
      }

      if (request.method === 'tools/list') {
        console.error('Fetching tools list');
        const tools = await this.fetchTools();
        return {
          jsonrpc: '2.0',
          result: { tools },
          id: id
        };
      }

      if (request.method === 'tools/call') {
        console.error(`Calling tool: ${request.params?.name}`);
        
        if (!request.params || !request.params.name) {
          throw new Error('Missing tool name in parameters');
        }
        
        const result = await this.callTool(
          request.params.name, 
          request.params.arguments || {}
        );
        
        return {
          jsonrpc: '2.0',
          result: {
            content: [{ 
              type: 'text', 
              text: result.message || JSON.stringify(result, null, 2)
            }],
            isError: !result.success
          },
          id: id
        };
      }

      throw new Error(`Unknown method: ${request.method}`);
      
    } catch (error) {
      console.error(`Error in handleRequest: ${error.message}`);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message
        },
        id: id
      };
    }
  }

  async fetchTools() {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${LINUX_IP}:${LINUX_PORT}/tools`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.error(`Fetched ${response.tools?.length || 0} tools`);
            resolve(response.tools || []);
          } catch (e) {
            console.error(`Error parsing tools response: ${e.message}`);
            reject(new Error(`Failed to parse tools response: ${e.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`Error fetching tools: ${error.message}`);
        reject(new Error(`Failed to fetch tools: ${error.message}`));
      });

      req.setTimeout(10000, () => {
        console.error('Timeout fetching tools');
        req.destroy();
        reject(new Error('Timeout fetching tools from server'));
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
            reject(new Error(`Failed to parse tool response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`Error calling tool ${toolName}: ${error.message}`);
        reject(new Error(`Failed to call tool ${toolName}: ${error.message}`));
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bridge
new MCPBridge();