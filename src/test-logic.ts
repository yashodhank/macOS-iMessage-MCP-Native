import { MessageDatabase } from './db.js';
import { AppleScriptService } from './applescript.js';

async function test() {
  console.log('--- Testing Database Logic ---');
  try {
    const db = new MessageDatabase(); // Try default real path
    const messages = db.getRecentMessages(1);
    console.log('Recent Message:', messages);
  } catch (err: any) {
    console.error('Database Error:', err.message);
    if (err.message.includes('CANTOPEN')) {
      console.log('TIP: This is a permission issue. Ensure Terminal has "Full Disk Access".');
    }
  }

  console.log('\n--- Testing AppleScript Logic ---');
  const apple = new AppleScriptService();
  try {
    const isRunning = await apple.isMessagesRunning();
    console.log('Is Messages.app running?', isRunning);
  } catch (err: any) {
    console.error('AppleScript Error:', err.message);
  }
}

test();
