#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OS = platform();

let cachedSoundFile = null;

// Precompute sound at startup to avoid first-call FS hit
getSoundFile();

function getSoundFile() {
  if (cachedSoundFile) return cachedSoundFile;
  
  // Priority: custom/default.mp3 → notification.mp3 → system beep
  const customSound = join(__dirname, 'custom', 'default.mp3');
  if (existsSync(customSound)) {
    return cachedSoundFile = { file: customSound, type: 'custom/default.mp3' };
  }
  
  const notificationFile = join(__dirname, 'notification.mp3');
  if (existsSync(notificationFile)) {
    return cachedSoundFile = { file: notificationFile, type: 'notification.mp3' };
  }
  
  return cachedSoundFile = { file: null, type: 'system beep' };
}

function systemBeep() {
  process.stdout.write('\x07');
}

function playAudioFile(file, callback) {
  const options = { stdio: 'ignore', detached: true };
  let callbackInvoked = false;
  
  const safeCallback = (hasError) => {
    if (!callbackInvoked) {
      callbackInvoked = true;
      callback(hasError);
    }
  };
  
  let child;
  if (OS === 'darwin') {
    child = spawn('afplay', [file], options);
  } else if (OS === 'linux') {
    child = spawn('paplay', [file], options);
  } else if (OS === 'win32') {
    const command = `(New-Object Media.SoundPlayer "${file.replace(/"/g, '""')}").PlaySync()`;
    const encoded = Buffer.from(command, 'utf16le').toString('base64');
    child = spawn('powershell', ['-NoProfile', '-EncodedCommand', encoded], 
      { ...options, windowsHide: true });
  }
  
  if (child) {
    child.on('error', () => safeCallback(true)); // Signal error
    child.on('close', (code) => safeCallback(code !== 0)); // Signal error only on non-zero exit
    child.unref();
  } else {
    safeCallback(true); // No player available
  }
}

function playSound() {
  const soundFile = getSoundFile();
  
  if (soundFile.file) {
    playAudioFile(soundFile.file, (hasError) => {
      // Only beep on error
      if (hasError) {
        systemBeep();
      }
    });
  } else {
    systemBeep();
  }
  
  return soundFile;
}

const server = new Server({ name: 'pingmcp', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'notify',
    description: 'Play a notification sound to alert the user',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string', description: 'Optional message' } }
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'notify') {
    const soundFile = playSound();
    const message = request.params.arguments?.message;
    const responseText = message 
      ? `Notification: "${message}" | Sound: ${soundFile.type}`
      : `Notification sound played: ${soundFile.type}`;
    
    return {
      content: [{ type: 'text', text: responseText }]
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('PingMCP Server running');