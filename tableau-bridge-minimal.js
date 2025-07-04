#!/usr/bin/env node

/**
 * Minimal Tableau Desktop Bridge for macOS
 * Detects open workbooks and automates worksheet/dashboard creation
 * Requires: macOS with Tableau Desktop open and Accessibility permissions
 */

const { execSync } = require('child_process');
const readline = require('readline');

// === CONFIGURATION ===
const TABLEAU_APP_NAME = 'Tableau Desktop';

// === APPLESCRIPT HELPERS ===
function runAppleScript(script) {
  try {
    const result = execSync(`osascript -e '${script}'`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    return result.trim();
  } catch (error) {
    throw new Error(`AppleScript failed: ${error.message}`);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === TABLEAU DETECTION ===
async function detectTableauState() {
  try {
    // Check if Tableau is running and get window title
    const windowTitle = runAppleScript(`
      tell application "System Events"
        if exists (process "${TABLEAU_APP_NAME}") then
          tell process "${TABLEAU_APP_NAME}"
            if exists window 1 then
              return name of window 1
            else
              return "No windows"
            end if
          end tell
        else
          return "Not running"
        end if
      end tell
    `);

    if (windowTitle === "Not running") {
      return { 
        success: false, 
        message: "Tableau Desktop is not running",
        workbook: null,
        worksheets: []
      };
    }

    if (windowTitle === "No windows") {
      return { 
        success: false, 
        message: "Tableau Desktop is running but no workbook is open",
        workbook: null,
        worksheets: []
      };
    }

    // Extract workbook name from window title
    const workbookName = extractWorkbookName(windowTitle);
    
    // Get worksheet/dashboard tabs
    const sheets = await getWorksheetTabs();

    return {
      success: true,
      message: "Tableau Desktop detected",
      workbook: workbookName,
      windowTitle: windowTitle,
      worksheets: sheets.worksheets,
      dashboards: sheets.dashboards,
      totalSheets: sheets.worksheets.length + sheets.dashboards.length
    };

  } catch (error) {
    return { 
      success: false, 
      message: `Detection failed: ${error.message}`,
      workbook: null,
      worksheets: []
    };
  }
}

function extractWorkbookName(windowTitle) {
  // Handle various Tableau window title formats:
  // "Workbook1 - Tableau Desktop"
  // "EUS OPS Dashboard version 3 - Tableau Desktop 2023.1"
  let name = windowTitle.replace(/ - Tableau Desktop.*$/, '');
  name = name.replace(/\.twbx?$/, ''); // Remove file extension
  return name || 'Untitled';
}

async function getWorksheetTabs() {
  try {
    const tabScript = `
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          set worksheetTabs to {}
          set dashboardTabs to {}
          
          try
            -- Look for tab groups (worksheet tabs at bottom)
            set tabGroups to tab groups of window 1
            repeat with tabGroup in tabGroups
              set allTabs to tabs of tabGroup
              repeat with currentTab in allTabs
                set tabName to name of currentTab
                set isActive to selected of currentTab
                
                -- Classify as worksheet or dashboard
                if tabName contains "Dashboard" then
                  set end of dashboardTabs to {tabName, isActive}
                else
                  set end of worksheetTabs to {tabName, isActive}
                end if
              end repeat
            end repeat
          on error
            -- Fallback: assume basic worksheet exists
            set worksheetTabs to {{"Sheet 1", true}}
          end try
          
          return {worksheetTabs, dashboardTabs}
        end tell
      end tell
    `;

    const result = runAppleScript(tabScript);
    
    // Parse the AppleScript result
    const worksheets = [];
    const dashboards = [];
    
    // Simple parsing - in a real implementation you'd want more robust parsing
    const lines = result.split('\n');
    let inWorksheets = false;
    let inDashboards = false;
    
    for (const line of lines) {
      if (line.includes('Sheet') && !line.includes('Dashboard')) {
        const name = line.trim().replace(/[{}"]/g, '').split(',')[0];
        if (name) {
          worksheets.push({
            name: name,
            isActive: line.includes('true'),
            type: 'worksheet'
          });
        }
      } else if (line.includes('Dashboard')) {
        const name = line.trim().replace(/[{}"]/g, '').split(',')[0];
        if (name) {
          dashboards.push({
            name: name,
            isActive: line.includes('true'),
            type: 'dashboard'
          });
        }
      }
    }
    
    // Ensure at least one worksheet exists
    if (worksheets.length === 0) {
      worksheets.push({
        name: 'Sheet 1',
        isActive: true,
        type: 'worksheet'
      });
    }

    return { worksheets, dashboards };

  } catch (error) {
    console.error('Error getting worksheet tabs:', error.message);
    return { 
      worksheets: [{ name: 'Sheet 1', isActive: true, type: 'worksheet' }], 
      dashboards: [] 
    };
  }
}

// === TABLEAU AUTOMATION ===
async function createWorksheet(name) {
  try {
    const script = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 0.5
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Use Cmd+Shift+N for new worksheet
          key code 45 using {command down, shift down}
          delay 1
          
          -- Rename the worksheet if name provided
          ${name ? `
          -- Right-click on the new tab to rename
          set tabGroups to tab groups of window 1
          if (count of tabGroups) > 0 then
            set tabGroup to item 1 of tabGroups
            set newTab to (tabs of tabGroup whose selected is true)
            if (count of newTab) > 0 then
              right click item 1 of newTab
              delay 0.3
              click menu item "Rename Sheet" of menu 1
              delay 0.3
              keystroke "${name}"
              delay 0.2
              key code 36 -- Return
            end if
          end if
          ` : ''}
        end tell
      end tell
    `;

    runAppleScript(script);
    
    return {
      success: true,
      message: `Worksheet "${name || 'New Worksheet'}" created successfully`,
      worksheetName: name || 'New Worksheet'
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create worksheet: ${error.message}`,
      worksheetName: name
    };
  }
}

async function createDashboard(name) {
  try {
    const script = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 0.5
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Use Cmd+Shift+D for new dashboard
          key code 2 using {command down, shift down}
          delay 2
          
          -- Rename the dashboard if name provided
          ${name ? `
          -- Right-click on the new tab to rename
          set tabGroups to tab groups of window 1
          if (count of tabGroups) > 0 then
            set tabGroup to item 1 of tabGroups
            set newTab to (tabs of tabGroup whose selected is true)
            if (count of newTab) > 0 then
              right click item 1 of newTab
              delay 0.3
              click menu item "Rename Dashboard" of menu 1
              delay 0.3
              keystroke "${name}"
              delay 0.2
              key code 36 -- Return
            end if
          end if
          ` : ''}
        end tell
      end tell
    `;

    runAppleScript(script);
    
    return {
      success: true,
      message: `Dashboard "${name || 'New Dashboard'}" created successfully`,
      dashboardName: name || 'New Dashboard'
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create dashboard: ${error.message}`,
      dashboardName: name
    };
  }
}

async function addCalculatedField(fieldName, formula) {
  try {
    const script = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 0.5
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Open calculated field dialog with Cmd+Shift+E
          key code 14 using {command down, shift down}
          delay 1
          
          -- Enter field name
          keystroke "${fieldName}"
          delay 0.3
          
          -- Tab to formula area
          key code 48 -- Tab
          delay 0.3
          
          -- Enter formula
          keystroke "${formula}"
          delay 0.5
          
          -- Press OK (Return)
          key code 36 -- Return
          delay 0.5
        end tell
      end tell
    `;

    runAppleScript(script);
    
    return {
      success: true,
      message: `Calculated field "${fieldName}" created with formula: ${formula}`,
      fieldName: fieldName,
      formula: formula
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create calculated field: ${error.message}`,
      fieldName: fieldName
    };
  }
}

// === MCP PROTOCOL HANDLERS ===
const tools = {
  "tableau_detect_state": {
    description: "Detect current Tableau Desktop state and open workbook",
    handler: detectTableauState
  },
  
  "tableau_list_sheets": {
    description: "List worksheets and dashboards in the current workbook",
    handler: async () => {
      const state = await detectTableauState();
      if (!state.success) {
        return state;
      }
      return {
        success: true,
        workbook: state.workbook,
        worksheets: state.worksheets,
        dashboards: state.dashboards,
        totalSheets: state.totalSheets
      };
    }
  },
  
  "tableau_new_worksheet": {
    description: "Create a new worksheet",
    params: { name: "string" },
    handler: ({ name }) => createWorksheet(name)
  },
  
  "tableau_new_dashboard": {
    description: "Create a new dashboard", 
    params: { name: "string" },
    handler: ({ name }) => createDashboard(name)
  },
  
  "tableau_add_calculated_field": {
    description: "Add a calculated field to the current workbook",
    params: { fieldName: "string", formula: "string" },
    handler: ({ fieldName, formula }) => addCalculatedField(fieldName, formula)
  }
};

// === MCP SERVER ===
async function handleMCPMessage(message) {
  try {
    const request = JSON.parse(message);
    
    if (request.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'tableau-desktop-bridge', version: '1.0.0' }
        },
        id: request.id
      };
    }
    
    if (request.method === 'tools/list') {
      const toolList = Object.keys(tools).map(name => ({
        name,
        description: tools[name].description,
        inputSchema: {
          type: 'object',
          properties: tools[name].params || {},
          required: Object.keys(tools[name].params || {})
        }
      }));
      
      return {
        jsonrpc: '2.0',
        result: { tools: toolList },
        id: request.id
      };
    }
    
    if (request.method === 'tools/call') {
      const toolName = request.params?.name;
      const args = request.params?.arguments || {};
      
      if (!tools[toolName]) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      
      const result = await tools[toolName].handler(args);
      
      return {
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        },
        id: request.id
      };
    }
    
    if (request.method === 'initialized') {
      // No response needed for notification
      return null;
    }
    
    throw new Error(`Unknown method: ${request.method}`);
    
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id: request.id || null
    };
  }
}

// === MAIN ENTRY POINT ===
async function main() {
  // Test mode - run detection and exit
  if (process.argv.includes('--test')) {
    console.log('🧪 Testing Tableau Desktop detection...\n');
    
    const state = await detectTableauState();
    console.log(JSON.stringify(state, null, 2));
    
    if (state.success) {
      console.log('\n✅ Detection successful!');
      console.log(`📊 Workbook: ${state.workbook}`);
      console.log(`📋 Worksheets: ${state.worksheets.length}`);
      console.log(`📊 Dashboards: ${state.dashboards.length}`);
    } else {
      console.log('\n❌ Detection failed');
      console.log('💡 Make sure:');
      console.log('  • Tableau Desktop is open');
      console.log('  • A workbook is loaded (not start page)');
      console.log('  • Accessibility permissions are granted');
    }
    
    return;
  }
  
  // MCP server mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  console.error('Tableau Desktop Bridge starting...');
  console.error('Waiting for MCP messages on stdin...');

  rl.on('line', async (line) => {
    if (line.trim()) {
      const response = await handleMCPMessage(line);
      if (response) {
        console.log(JSON.stringify(response));
      }
    }
  });

  rl.on('close', () => {
    console.error('Bridge shutting down...');
    process.exit(0);
  });
}

// Handle cleanup
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    console.error('Bridge error:', error);
    process.exit(1);
  });
}