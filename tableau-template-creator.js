#!/usr/bin/env node

/**
 * Tableau Template Creator
 * Creates worksheets from predefined templates using the data schema
 */

const dataSchema = require('./tableau-data-schema.js');
const { execSync } = require('child_process');

const TABLEAU_APP_NAME = 'Tableau Desktop';

function runAppleScript(script) {
  try {
    const result = execSync(`osascript -e '${script}'`, { 
      encoding: 'utf8',
      timeout: 15000 
    });
    return result.trim();
  } catch (error) {
    throw new Error(`AppleScript failed: ${error.message}`);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createWorksheetFromTemplate(templateName) {
  try {
    const template = dataSchema.getWorksheetTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    console.log(`Creating worksheet: ${template.name}`);
    console.log(`Description: ${template.description}`);
    console.log(`Data source: ${template.dataSource}`);

    // Step 1: Create new worksheet
    const newWorksheetScript = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 0.5
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Create new worksheet (Cmd+Shift+N)
          key code 45 using {command down, shift down}
          delay 2
          
          -- Rename worksheet
          set tabGroups to tab groups of window 1
          if (count of tabGroups) > 0 then
            set tabGroup to item 1 of tabGroups
            set newTab to (tabs of tabGroup whose selected is true)
            if (count of newTab) > 0 then
              right click item 1 of newTab
              delay 0.3
              click menu item "Rename Sheet" of menu 1
              delay 0.3
              keystroke "${template.name}"
              delay 0.2
              key code 36 -- Return
              delay 1
            end if
          end if
        end tell
      end tell
    `;

    runAppleScript(newWorksheetScript);
    console.log(`✅ Created worksheet: ${template.name}`);

    // Step 2: Add calculated fields if template requires them
    if (template.calculatedFields) {
      console.log('Adding calculated fields...');
      for (const [fieldName, formula] of Object.entries(template.calculatedFields)) {
        await addCalculatedField(fieldName, formula);
        await delay(1000);
      }
    }

    // Step 3: Build the worksheet according to template config
    if (template.config) {
      await buildWorksheetLayout(template.config);
    }

    return {
      success: true,
      message: `Template worksheet '${template.name}' created successfully`,
      templateName: templateName,
      worksheetName: template.name
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create template worksheet: ${error.message}`,
      templateName: templateName
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
          -- Open calculated field dialog (Cmd+Shift+E)
          key code 14 using {command down, shift down}
          delay 1.5
          
          -- Enter field name
          keystroke "${fieldName}"
          delay 0.3
          
          -- Tab to formula area
          key code 48 -- Tab
          delay 0.3
          
          -- Clear any existing content and enter formula
          key code 0 using {command down} -- Cmd+A to select all
          delay 0.2
          keystroke "${formula}"
          delay 0.5
          
          -- Press OK (Return)
          key code 36 -- Return
          delay 1
        end tell
      end tell
    `;

    runAppleScript(script);
    console.log(`✅ Added calculated field: ${fieldName}`);

  } catch (error) {
    console.log(`⚠️  Failed to add calculated field '${fieldName}': ${error.message}`);
  }
}

async function buildWorksheetLayout(config) {
  try {
    console.log('Building worksheet layout...');

    // This is a simplified layout builder
    // In a full implementation, you would drag fields to shelves
    const layoutScript = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 1
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Focus on the worksheet area
          click at {400, 300}
          delay 0.5
          
          -- Add basic instructions as text
          -- This is a placeholder - real implementation would drag fields
          -- to Rows, Columns, and Marks shelves
        end tell
      end tell
    `;

    runAppleScript(layoutScript);
    console.log('✅ Basic layout applied');

  } catch (error) {
    console.log(`⚠️  Layout building failed: ${error.message}`);
  }
}

async function createKPIDashboard(kpiList = []) {
  try {
    console.log('Creating KPI Dashboard...');

    // Create new dashboard
    const dashboardScript = `
      tell application "${TABLEAU_APP_NAME}"
        activate
        delay 0.5
      end tell
      
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Create new dashboard (Cmd+Shift+D)
          key code 2 using {command down, shift down}
          delay 2
          
          -- Rename dashboard
          set tabGroups to tab groups of window 1
          if (count of tabGroups) > 0 then
            set tabGroup to item 1 of tabGroups
            set newTab to (tabs of tabGroup whose selected is true)
            if (count of newTab) > 0 then
              right click item 1 of newTab
              delay 0.3
              click menu item "Rename Dashboard" of menu 1
              delay 0.3
              keystroke "KPI Dashboard"
              delay 0.2
              key code 36 -- Return
              delay 1
            end if
          end if
        end tell
      end tell
    `;

    runAppleScript(dashboardScript);

    // Add KPI text objects
    for (const kpiName of kpiList) {
      const kpi = dataSchema.getBusinessKPI(kpiName);
      if (kpi) {
        await addKPITextBox(kpiName, kpi);
        await delay(1000);
      }
    }

    return {
      success: true,
      message: 'KPI Dashboard created successfully',
      kpiCount: kpiList.length
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create KPI dashboard: ${error.message}`
    };
  }
}

async function addKPITextBox(kpiName, kpiData) {
  try {
    const textContent = `${kpiName}\\nFormula: ${kpiData.formula}\\nTarget: ${kpiData.target}`;
    
    const textScript = `
      tell application "System Events"
        tell process "${TABLEAU_APP_NAME}"
          -- Add text object (T key)
          keystroke "t"
          delay 0.5
          
          -- Click to place text box
          click at {200, 200}
          delay 0.5
          
          -- Enter KPI information
          keystroke "${textContent}"
          delay 0.3
          
          -- Press Escape to finish editing
          key code 53 -- Escape
          delay 0.5
        end tell
      end tell
    `;

    runAppleScript(textScript);
    console.log(`✅ Added KPI: ${kpiName}`);

  } catch (error) {
    console.log(`⚠️  Failed to add KPI text: ${kpiName}`);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Tableau Template Creator');
    console.log('Usage:');
    console.log('  node tableau-template-creator.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list-templates           - Show all available templates');
    console.log('  create <template-name>   - Create worksheet from template');
    console.log('  list-kpis               - Show all available KPIs');
    console.log('  create-kpi-dashboard    - Create dashboard with all KPIs');
    console.log('');
    console.log('Examples:');
    console.log('  node tableau-template-creator.js list-templates');
    console.log('  node tableau-template-creator.js create inc_trend');
    console.log('  node tableau-template-creator.js create-kpi-dashboard');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list-templates':
      console.log('Available Worksheet Templates:');
      console.log('=============================');
      for (const [key, template] of Object.entries(dataSchema.worksheetTemplates)) {
        console.log(`${key}: ${template.name}`);
        console.log(`  Description: ${template.description}`);
        console.log(`  Data Source: ${template.dataSource}`);
        console.log('');
      }
      break;

    case 'create':
      if (args.length < 2) {
        console.log('Error: Please specify template name');
        console.log('Use "list-templates" to see available templates');
        return;
      }
      const templateName = args[1];
      const result = await createWorksheetFromTemplate(templateName);
      console.log(JSON.stringify(result, null, 2));
      break;

    case 'list-kpis':
      console.log('Available Business KPIs:');
      console.log('========================');
      for (const [key, kpi] of Object.entries(dataSchema.businessKPIs)) {
        console.log(`${key}:`);
        console.log(`  Formula: ${kpi.formula}`);
        console.log(`  Target: ${kpi.target}`);
        console.log(`  Data Source: ${kpi.dataSource}`);
        console.log('');
      }
      break;

    case 'create-kpi-dashboard':
      const kpiNames = Object.keys(dataSchema.businessKPIs);
      const dashboardResult = await createKPIDashboard(kpiNames);
      console.log(JSON.stringify(dashboardResult, null, 2));
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Use without arguments to see help');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  createWorksheetFromTemplate,
  createKPIDashboard,
  addCalculatedField
};