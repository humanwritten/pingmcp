#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const customSound = join(__dirname, 'custom', 'default.mp3');

function getSoundFile() {
  if (existsSync(customSound)) return { file: customSound, type: 'custom/default.mp3' };
  
  try {
    const audioFiles = readdirSync(__dirname).filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a'));
    
    // Look for notification.mp3 first, then use first alphabetically
    const preferredFile = audioFiles.find(f => f === 'notification.mp3') || audioFiles[0];
    if (preferredFile) return { file: join(__dirname, preferredFile), type: preferredFile };
  } catch {}
  
  return { file: null, type: 'system beep' };
}

function playSound() {
  const os = platform();
  const { file } = getSoundFile();
  
  if (file) {
    if (os === 'darwin') {
      execFile('afplay', [file], () => {});
    } else if (os === 'linux') {
      execFile('paplay', [file], () => process.stdout.write('\x07'));
    } else if (os === 'win32') {
      execFile('powershell', ['-NoProfile', '-Command', 
        `(New-Object Media.SoundPlayer "${file}").PlaySync()`], () => process.stdout.write('\x07'));
    }
  } else {
    process.stdout.write('\x07');
  }
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
    playSound();
    return {
      content: [{ type: 'text', text: `Notification sound played: ${getSoundFile().type}` }]
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('PingMCP Server running');