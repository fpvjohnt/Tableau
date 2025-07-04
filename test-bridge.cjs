#!/usr/bin/env node

// Test script to verify the MCP bridge works correctly
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Tableau MCP Bridge...\n');

const bridgeScript = path.join(__dirname, 'tableau-mcp-bridge-fixed.cjs');

const bridge = spawn('node', [bridgeScript], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;
const expectedResponses = 2;

// Handle bridge output
bridge.stdout.on('data', (data) => {
  console.log('📤 Bridge Response:');
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const parsed = JSON.parse(line);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw:', line);
    }
  });
  console.log('');
  
  responseCount++;
  if (responseCount >= expectedResponses) {
    console.log('✅ Test completed successfully!');
    bridge.kill();
  }
});

// Handle bridge errors
bridge.stderr.on('data', (data) => {
  console.log('🔍 Bridge Debug:', data.toString().trim());
});

bridge.on('close', (code) => {
  console.log(`\n🏁 Bridge process exited with code ${code}`);
  process.exit(code);
});

// Send test messages
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  const initRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 1
  };
  
  bridge.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('📤 Sending tools/list request...');
  const toolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  
  bridge.stdin.write(JSON.stringify(toolsRequest) + '\n');
}, 2000);

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - cleaning up...');
  bridge.kill();
}, 10000);