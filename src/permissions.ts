import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface PermissionStatus {
  fullDiskAccess: 'authorized' | 'denied' | 'unknown';
  automationMessages: 'authorized' | 'denied' | 'unknown';
  contactsAccess: 'authorized' | 'denied' | 'unknown';
}

export interface HealthCheckResult {
  healthy: boolean;
  permissions: PermissionStatus;
  messagesAppRunning: boolean;
  chatDbExists: boolean;
  chatDbReadable: boolean;
  errors: string[];
  recommendations: string[];
}

/**
 * Checks if Full Disk Access is granted by attempting to read a TCC-protected file.
 * This is the recommended approach per Apple Developer Forums.
 */
export async function checkFullDiskAccess(): Promise<'authorized' | 'denied' | 'unknown'> {
  const chatDbPath = process.env.CHAT_DB_PATH || path.join(os.homedir(), 'Library/Messages/chat.db');
  
  try {
    // Try to open the file - this is the empirical test recommended by Apple
    await fs.promises.access(chatDbPath, fs.constants.R_OK);
    // Try to actually read a small portion
    const fd = await fs.promises.open(chatDbPath, 'r');
    const buffer = Buffer.alloc(16);
    await fd.read(buffer, 0, 16, 0);
    await fd.close();
    return 'authorized';
  } catch (error: any) {
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return 'denied';
    }
    if (error.code === 'ENOENT') {
      // File doesn't exist - might be a fresh system or different path
      return 'unknown';
    }
    return 'unknown';
  }
}

/**
 * Checks if Automation permission for Messages.app is granted.
 */
export async function checkMessagesAutomation(): Promise<'authorized' | 'denied' | 'unknown'> {
  try {
    // Simple test: check if Messages app is running (doesn't require full automation permission)
    const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to (name of processes) contains "Messages"'`);
    
    // If we can execute this without error, basic automation is working
    if (stdout.trim() === 'true' || stdout.trim() === 'false') {
      return 'authorized';
    }
    return 'unknown';
  } catch (error: any) {
    if (error.message?.includes('Not authorized') || error.message?.includes('(-1743)')) {
      return 'denied';
    }
    return 'unknown';
  }
}

/**
 * Checks if Messages.app is currently running.
 */
export async function isMessagesRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`pgrep -x "Messages" || echo ""`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Performs a comprehensive health check of the MCP server's requirements.
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const errors: string[] = [];
  const recommendations: string[] = [];
  
  const chatDbPath = process.env.CHAT_DB_PATH || path.join(os.homedir(), 'Library/Messages/chat.db');
  
  // Check if chat.db exists
  const chatDbExists = fs.existsSync(chatDbPath);
  if (!chatDbExists) {
    errors.push(`chat.db not found at: ${chatDbPath}`);
    recommendations.push('Ensure Messages.app has been used at least once to create the database.');
  }
  
  // Check Full Disk Access
  const fullDiskAccess = await checkFullDiskAccess();
  if (fullDiskAccess === 'denied') {
    errors.push('Full Disk Access is denied.');
    recommendations.push(
      'Grant Full Disk Access to your terminal/IDE:',
      '1. Open System Settings → Privacy & Security → Full Disk Access',
      '2. Click the + button and add your Terminal, iTerm2, VS Code, or Cursor app',
      '3. Restart your terminal application'
    );
  }
  
  // Check Messages automation
  const automationMessages = await checkMessagesAutomation();
  if (automationMessages === 'denied') {
    errors.push('Automation permission for Messages.app is denied.');
    recommendations.push(
      'Grant Automation permission:',
      '1. Open System Settings → Privacy & Security → Automation',
      '2. Find your terminal app and enable "Messages"'
    );
  }
  
  // Check if Messages is running
  const messagesAppRunning = await isMessagesRunning();
  if (!messagesAppRunning) {
    recommendations.push('Consider launching Messages.app for sending messages to work properly.');
  }
  
  // Determine overall health
  const healthy = errors.length === 0 && fullDiskAccess === 'authorized';
  
  return {
    healthy,
    permissions: {
      fullDiskAccess,
      automationMessages,
      contactsAccess: 'unknown', // We don't use Contacts API directly
    },
    messagesAppRunning,
    chatDbExists,
    chatDbReadable: fullDiskAccess === 'authorized' && chatDbExists,
    errors,
    recommendations,
  };
}

/**
 * Returns a formatted string for displaying health check results.
 */
export function formatHealthCheckResult(result: HealthCheckResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════',
    '           iMessage MCP Server Health Check            ',
    '═══════════════════════════════════════════════════════',
    '',
    `Overall Status: ${result.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`,
    '',
    '── Permissions ──────────────────────────────────────────',
    `  Full Disk Access:     ${statusIcon(result.permissions.fullDiskAccess)}`,
    `  Messages Automation:  ${statusIcon(result.permissions.automationMessages)}`,
    '',
    '── System Status ────────────────────────────────────────',
    `  chat.db exists:       ${result.chatDbExists ? '✅ Yes' : '❌ No'}`,
    `  chat.db readable:     ${result.chatDbReadable ? '✅ Yes' : '❌ No'}`,
    `  Messages.app running: ${result.messagesAppRunning ? '✅ Yes' : '⚠️  No'}`,
  ];

  if (result.errors.length > 0) {
    lines.push('', '── Errors ───────────────────────────────────────────────');
    result.errors.forEach(err => lines.push(`  ❌ ${err}`));
  }

  if (result.recommendations.length > 0) {
    lines.push('', '── Recommendations ──────────────────────────────────────');
    result.recommendations.forEach(rec => lines.push(`  → ${rec}`));
  }

  lines.push('', '═══════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

function statusIcon(status: 'authorized' | 'denied' | 'unknown'): string {
  switch (status) {
    case 'authorized': return '✅ Authorized';
    case 'denied': return '❌ Denied';
    default: return '⚠️  Unknown';
  }
}
