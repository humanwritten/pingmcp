#!/usr/bin/env node

import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OS = platform();
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

// Test configuration - set to null to test all sounds
// Options: 'custom', 'notification', 'other', 'beep', or null for all
const TEST_ONLY = null;

function isValidAudioFile(filename) {
  return AUDIO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));
}

function discoverSounds() {
  const allSounds = [];
  
  // 1. Custom sound
  const customSound = join(__dirname, 'custom', 'default.mp3');
  if (existsSync(customSound)) {
    allSounds.push({ file: customSound, type: 'custom/default.mp3', priority: 1, category: 'custom' });
  }
  
  // 2. Built-in notification sound
  const notificationFile = join(__dirname, 'notification.mp3');
  if (existsSync(notificationFile)) {
    allSounds.push({ file: notificationFile, type: 'notification.mp3', priority: 2, category: 'notification' });
  }
  
  // 3. Any other audio files in main directory
  try {
    const audioFiles = readdirSync(__dirname, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && isValidAudioFile(dirent.name))
      .map(dirent => dirent.name)
      .filter(name => name !== 'notification.mp3') // Exclude already found
      .sort();
    
    audioFiles.forEach(file => {
      allSounds.push({ 
        file: join(__dirname, file), 
        type: file, 
        priority: 3,
        category: 'other'
      });
    });
  } catch (error) {
    console.error('Failed to scan directory:', error.message);
  }
  
  // 4. System beep
  allSounds.push({ file: null, type: 'system beep', priority: 4, category: 'beep' });
  
  // Filter based on TEST_ONLY configuration
  if (TEST_ONLY) {
    return allSounds.filter(sound => sound.category === TEST_ONLY);
  }
  
  return allSounds;
}

function playAudioFile(file) {
  return new Promise((resolve, reject) => {
    const options = { stdio: 'ignore' };
    
    if (OS === 'darwin') {
      const child = execFile('afplay', [file], options, (error) => {
        if (error) reject(error);
        else resolve();
      });
      if (child) child.unref();
    } else if (OS === 'linux') {
      const players = ['paplay', 'aplay', 'play', 'ffplay'];
      
      const tryPlayer = (index) => {
        if (index >= players.length) {
          reject(new Error('No audio player found'));
          return;
        }
        
        const player = players[index];
        const args = player === 'ffplay' ? ['-nodisp', '-autoexit', '-loglevel', 'error', file] : [file];
        
        const child = execFile(player, args, options, (error) => {
          if (error && index < players.length - 1) {
            tryPlayer(index + 1);
          } else if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
        if (child) child.unref();
      };
      
      tryPlayer(0);
    } else if (OS === 'win32') {
      const command = `(New-Object Media.SoundPlayer "${file.replace(/"/g, '""')}").PlaySync()`;
      const encoded = Buffer.from(command, 'utf16le').toString('base64');
      const child = execFile('powershell', ['-NoProfile', '-EncodedCommand', encoded], 
        { ...options, windowsHide: true }, (error) => {
        if (error) reject(error);
        else resolve();
      });
      if (child) child.unref();
    } else {
      reject(new Error('Unsupported platform'));
    }
  });
}

function systemBeep() {
  return new Promise((resolve) => {
    // Try multiple beeps to make it more audible
    process.stdout.write('\x07');
    setTimeout(() => {
      process.stdout.write('\x07');
      setTimeout(() => {
        process.stdout.write('\x07');
        setTimeout(resolve, 500);
      }, 200);
    }, 200);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllSounds() {
  if (TEST_ONLY) {
    console.log(`🎯 Testing only: ${TEST_ONLY} sounds\n`);
  } else {
    console.log('🔍 Discovering available sounds...\n');
  }
  
  const sounds = discoverSounds();
  
  console.log(`Found ${sounds.length} sound options:\n`);
  sounds.forEach((sound, index) => {
    console.log(`${index + 1}. Priority ${sound.priority}: ${sound.type}${sound.file ? ` (${sound.file})` : ''}`);
  });
  
  console.log('\n🎵 Testing each sound...\n');
  
  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i];
    console.log(`▶️  Playing: ${sound.type}`);
    
    try {
      if (sound.file) {
        await playAudioFile(sound.file);
      } else {
        await systemBeep();
      }
      console.log(`✅ Success: ${sound.type}`);
    } catch (error) {
      console.log(`❌ Failed: ${sound.type} - ${error.message}`);
    }
    
    // Wait between sounds
    if (i < sounds.length - 1) {
      console.log('   ⏳ Waiting 2 seconds...\n');
      await sleep(2000);
    }
  }
  
  console.log('\n🎉 Sound test complete!');
  console.log(`\nℹ️  PingMCP will use the first available sound in priority order.`);
  console.log(`   Current selection: ${sounds.find(s => s.file || s.type === 'system beep').type}`);
}

// Run the test
testAllSounds().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});