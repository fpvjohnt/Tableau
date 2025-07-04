declare module 'robotjs' {
  export function getMousePos(): { x: number; y: number };
  export function moveMouse(x: number, y: number): void;
  export function mouseClick(button?: string): void;
  export function mouseToggle(direction?: string): void;
  export function dragMouse(x: number, y: number): void;
  export function typeString(text: string): void;
  export function keyTap(key: string, modifiers?: string[]): void;
  export function getScreenSize(): { width: number; height: number };
  export function setXDisplayName(display: string): void;
  export function setKeyboardDelay(ms: number): void;
  export function setMouseDelay(ms: number): void;
}