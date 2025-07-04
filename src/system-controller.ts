import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  region?: Rectangle;
  format?: 'png' | 'jpg';
}

/**
 * Cross-platform system controller for UI automation
 * Handles mouse, keyboard, and screen capture operations
 */
export class SystemController {
  private platform: string;
  private robotjs: any;

  constructor() {
    this.platform = os.platform();
    this.initializeRobotJS();
  }

  private async initializeRobotJS() {
    try {
      // Try to dynamically import robotjs if available
      const robotjsModule = await eval("import('robotjs')");
      this.robotjs = robotjsModule.default || robotjsModule;
      
      // Configure robotjs for better performance
      if (this.robotjs && this.robotjs.setXDisplayName) {
        this.robotjs.setXDisplayName(process.env.DISPLAY || ':0.0');
      }
      if (this.robotjs && this.robotjs.setKeyboardDelay) {
        this.robotjs.setKeyboardDelay(10);
      }
      if (this.robotjs && this.robotjs.setMouseDelay) {
        this.robotjs.setMouseDelay(10);
      }
    } catch (error) {
      console.warn('RobotJS not available, using platform-specific fallback methods');
      this.robotjs = null;
    }
  }

  /**
   * Get mouse position
   */
  getMousePosition(): Point {
    if (this.robotjs) {
      return this.robotjs.getMousePos();
    }
    throw new Error('Mouse position detection not available');
  }

  /**
   * Move mouse to position
   */
  async moveMouse(x: number, y: number): Promise<void> {
    if (this.robotjs) {
      this.robotjs.moveMouse(x, y);
      return;
    }

    // Fallback methods for different platforms
    if (this.platform === 'darwin') {
      await this.macMoveMouse(x, y);
    } else if (this.platform === 'win32') {
      await this.windowsMoveMouse(x, y);
    } else {
      await this.linuxMoveMouse(x, y);
    }
  }

  /**
   * Click at position
   */
  async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (this.robotjs) {
      this.robotjs.moveMouse(x, y);
      await this.delay(50);
      this.robotjs.mouseClick(button);
      return;
    }

    await this.moveMouse(x, y);
    await this.delay(50);

    if (this.platform === 'darwin') {
      await this.macClick(button);
    } else if (this.platform === 'win32') {
      await this.windowsClick(button);
    } else {
      await this.linuxClick(button);
    }
  }

  /**
   * Double click at position
   */
  async doubleClick(x: number, y: number): Promise<void> {
    await this.click(x, y);
    await this.delay(50);
    await this.click(x, y);
  }

  /**
   * Right click at position
   */
  async rightClick(x: number, y: number): Promise<void> {
    await this.click(x, y, 'right');
  }

  /**
   * Drag from one position to another
   */
  async drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    if (this.robotjs) {
      this.robotjs.moveMouse(fromX, fromY);
      this.robotjs.mouseToggle('down');
      await this.delay(100);
      this.robotjs.dragMouse(toX, toY);
      await this.delay(100);
      this.robotjs.mouseToggle('up');
      return;
    }

    // Fallback implementation
    await this.moveMouse(fromX, fromY);
    await this.delay(50);
    
    if (this.platform === 'darwin') {
      await execAsync(`osascript -e 'tell application "System Events" to mouse down 1'`);
      await this.moveMouse(toX, toY);
      await this.delay(100);
      await execAsync(`osascript -e 'tell application "System Events" to mouse up 1'`);
    }
  }

  /**
   * Type text
   */
  async type(text: string): Promise<void> {
    if (this.robotjs) {
      this.robotjs.typeString(text);
      return;
    }

    if (this.platform === 'darwin') {
      await this.macType(text);
    } else if (this.platform === 'win32') {
      await this.windowsType(text);
    } else {
      await this.linuxType(text);
    }
  }

  /**
   * Press key combination
   */
  async keyPress(keys: string | string[]): Promise<void> {
    if (this.robotjs) {
      if (Array.isArray(keys)) {
        this.robotjs.keyTap(keys[keys.length - 1], keys.slice(0, -1));
      } else {
        this.robotjs.keyTap(keys);
      }
      return;
    }

    const keyString = Array.isArray(keys) ? keys.join('+') : keys;
    
    if (this.platform === 'darwin') {
      await this.macKeyPress(keyString);
    } else if (this.platform === 'win32') {
      await this.windowsKeyPress(keyString);
    } else {
      await this.linuxKeyPress(keyString);
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
    try {
      if (this.platform === 'darwin') {
        return await this.macScreenshot(options);
      } else if (this.platform === 'win32') {
        return await this.windowsScreenshot(options);
      } else {
        return await this.linuxScreenshot(options);
      }
    } catch (error) {
      throw new Error(`Screenshot failed: ${error}`);
    }
  }

  /**
   * Get screen size
   */
  getScreenSize(): { width: number; height: number } {
    if (this.robotjs) {
      return this.robotjs.getScreenSize();
    }

    // Default fallback
    return { width: 1920, height: 1080 };
  }

  /**
   * Find application windows
   */
  async findWindows(appName: string): Promise<any[]> {
    if (this.platform === 'darwin') {
      return await this.macFindWindows(appName);
    } else if (this.platform === 'win32') {
      return await this.windowsFindWindows(appName);
    } else {
      return await this.linuxFindWindows(appName);
    }
  }

  /**
   * Activate application window
   */
  async activateWindow(windowId: string): Promise<void> {
    if (this.platform === 'darwin') {
      await this.macActivateWindow(windowId);
    } else if (this.platform === 'win32') {
      await this.windowsActivateWindow(windowId);
    } else {
      await this.linuxActivateWindow(windowId);
    }
  }

  // Platform-specific implementations

  private async macMoveMouse(x: number, y: number): Promise<void> {
    await execAsync(`osascript -e 'tell application "System Events" to set mouse location to {${x}, ${y}}'`);
  }

  private async macClick(button: string): Promise<void> {
    const buttonMap = { left: '1', right: '2', middle: '3' };
    const buttonNum = buttonMap[button as keyof typeof buttonMap] || '1';
    await execAsync(`osascript -e 'tell application "System Events" to click mouse button ${buttonNum}'`);
  }

  private async macType(text: string): Promise<void> {
    const escapedText = text.replace(/"/g, '\\"');
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`);
  }

  private async macKeyPress(keys: string): Promise<void> {
    const keyMapping: { [key: string]: string } = {
      'cmd': 'command',
      'ctrl': 'control',
      'alt': 'option',
      'shift': 'shift',
      'enter': 'return',
      'esc': 'escape',
      'tab': 'tab',
      'space': 'space'
    };

    const parts = keys.split('+').map(k => keyMapping[k.toLowerCase()] || k);
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];

    let script = 'tell application "System Events" to keystroke "' + key + '"';
    if (modifiers.length > 0) {
      script = 'tell application "System Events" to keystroke "' + key + '" using {' + 
               modifiers.join(', ') + '}';
    }

    await execAsync(`osascript -e '${script}'`);
  }

  private async macScreenshot(options: ScreenshotOptions): Promise<Buffer> {
    const tempFile = path.join(os.tmpdir(), `screenshot_${Date.now()}.png`);
    
    let command = `screencapture -x "${tempFile}"`;
    if (options.region) {
      const { x, y, width, height } = options.region;
      command = `screencapture -x -R ${x},${y},${width},${height} "${tempFile}"`;
    }

    await execAsync(command);
    const buffer = await fs.readFile(tempFile);
    await fs.remove(tempFile);
    return buffer;
  }

  private async macFindWindows(appName: string): Promise<any[]> {
    try {
      const { stdout } = await execAsync(`osascript -e '
        tell application "System Events"
          set windowList to {}
          repeat with proc in (processes whose name contains "${appName}")
            repeat with win in (windows of proc)
              set end of windowList to {name of win, id of win, name of proc}
            end repeat
          end repeat
          return windowList
        end tell'`);
      
      return stdout.trim() ? JSON.parse(stdout) : [];
    } catch {
      return [];
    }
  }

  private async macActivateWindow(windowId: string): Promise<void> {
    await execAsync(`osascript -e 'tell application "System Events" to set frontmost of window id ${windowId} to true'`);
  }

  private async windowsMoveMouse(x: number, y: number): Promise<void> {
    // Windows PowerShell implementation
    await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`);
  }

  private async windowsClick(button: string): Promise<void> {
    // Windows implementation using PowerShell
    const clickScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Application]::DoEvents()
      [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    `;
    await execAsync(`powershell -command "${clickScript}"`);
  }

  private async windowsType(text: string): Promise<void> {
    const escapedText = text.replace(/"/g, '""');
    await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`);
  }

  private async windowsKeyPress(keys: string): Promise<void> {
    await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')"`);
  }

  private async windowsScreenshot(options: ScreenshotOptions): Promise<Buffer> {
    // Windows screenshot implementation
    const tempFile = path.join(os.tmpdir(), `screenshot_${Date.now()}.png`);
    
    const script = `
      Add-Type -AssemblyName System.Drawing
      Add-Type -AssemblyName System.Windows.Forms
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bitmap.Save("${tempFile}", [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    
    await execAsync(`powershell -command "${script}"`);
    const buffer = await fs.readFile(tempFile);
    await fs.remove(tempFile);
    return buffer;
  }

  private async windowsFindWindows(appName: string): Promise<any[]> {
    try {
      const { stdout } = await execAsync(`powershell -command "Get-Process | Where-Object {$_.ProcessName -like '*${appName}*'} | Select-Object Id, ProcessName, MainWindowTitle"`);
      return stdout.trim().split('\n').slice(3).map(line => {
        const parts = line.trim().split(/\s+/);
        return { id: parts[0], name: parts[1], title: parts.slice(2).join(' ') };
      });
    } catch {
      return [];
    }
  }

  private async windowsActivateWindow(windowId: string): Promise<void> {
    await execAsync(`powershell -command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate(${windowId})"`);
  }

  // Linux implementations (X11)
  private async linuxMoveMouse(x: number, y: number): Promise<void> {
    try {
      await execAsync(`xdotool mousemove ${x} ${y}`);
    } catch {
      console.warn('xdotool not available for mouse movement');
    }
  }

  private async linuxClick(button: string): Promise<void> {
    try {
      const buttonMap = { left: '1', right: '3', middle: '2' };
      const buttonNum = buttonMap[button as keyof typeof buttonMap] || '1';
      await execAsync(`xdotool click ${buttonNum}`);
    } catch {
      console.warn('xdotool not available for mouse clicks');
    }
  }

  private async linuxType(text: string): Promise<void> {
    try {
      await execAsync(`xdotool type "${text}"`);
    } catch {
      console.warn('xdotool not available for typing');
    }
  }

  private async linuxKeyPress(keys: string): Promise<void> {
    try {
      await execAsync(`xdotool key ${keys.replace(/\+/g, '+')}`);
    } catch {
      console.warn('xdotool not available for key presses');
    }
  }

  private async linuxScreenshot(options: ScreenshotOptions): Promise<Buffer> {
    const tempFile = path.join(os.tmpdir(), `screenshot_${Date.now()}.xwd`);
    const pngFile = path.join(os.tmpdir(), `screenshot_${Date.now()}.png`);
    
    try {
      // Use xwd to capture screenshot
      let command = `xwd -root -out "${tempFile}"`;
      if (options.region) {
        // xwd doesn't support cropping directly, so we'll capture full screen
        command = `xwd -root -out "${tempFile}"`;
      }

      await execAsync(command);
      
      // Convert xwd to png if convert is available
      try {
        await execAsync(`convert "${tempFile}" "${pngFile}"`);
        const buffer = await fs.readFile(pngFile);
        await fs.remove(tempFile).catch(() => {});
        await fs.remove(pngFile).catch(() => {});
        return buffer;
      } catch {
        // If convert is not available, return xwd file as buffer
        const buffer = await fs.readFile(tempFile);
        await fs.remove(tempFile).catch(() => {});
        return buffer;
      }
    } catch (error) {
      // Cleanup
      await fs.remove(tempFile).catch(() => {});
      await fs.remove(pngFile).catch(() => {});
      throw new Error(`Linux screenshot failed: ${error}. Available screenshot tools: xwd (used), but may need 'convert' from ImageMagick for PNG format.`);
    }
  }

  private async linuxFindWindows(appName: string): Promise<any[]> {
    try {
      // Use xwininfo to find windows
      const { stdout } = await execAsync(`xwininfo -tree -root | grep -i "${appName}"`);
      const windows = [];
      
      for (const line of stdout.trim().split('\n')) {
        const match = line.match(/^\s*(0x[a-f0-9]+)\s+"([^"]+)"/);
        if (match) {
          windows.push({
            id: match[1],
            title: match[2],
            name: appName
          });
        }
      }
      
      return windows;
    } catch (error) {
      console.error('Error finding windows:', error);
      return [];
    }
  }

  private async linuxActivateWindow(windowId: string): Promise<void> {
    try {
      // Try xdotool first, fallback to wmctrl
      await execAsync(`xdotool windowactivate ${windowId}`);
    } catch {
      try {
        await execAsync(`wmctrl -ia ${windowId}`);
      } catch {
        // Last resort: use xwininfo and focus
        await execAsync(`xprop -id ${windowId} -f _NET_ACTIVE_WINDOW 32a -set _NET_ACTIVE_WINDOW ${windowId}`);
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}