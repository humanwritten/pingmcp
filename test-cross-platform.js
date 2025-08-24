#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OS = platform();

// Test configuration
const TEST_MESSAGE = 'Cross-platform test notification';
const TEST_TIMEOUT = 10000; // 10 seconds

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function createMCPTestInput() {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "notify",
      arguments: {
        message: TEST_MESSAGE
      }
    },
    id: 1
  }) + '\n';
}

function testPlatformAudio() {
  return new Promise((resolve) => {
    console.log(`\n${colorize('cyan', '🎵 Testing native audio on ' + OS + '...')}`);
    
    let testCmd, testArgs;
    const testFile = join(__dirname, 'notification.mp3');
    
    if (!existsSync(testFile)) {
      console.log(`${colorize('yellow', '⚠️  No test audio file found, skipping native audio test')}`);
      return resolve({ success: false, reason: 'No audio file' });
    }

    if (OS === 'darwin') {
      testCmd = 'afplay';
      testArgs = [testFile];
    } else if (OS === 'linux') {
      testCmd = 'paplay';
      testArgs = [testFile];
    } else if (OS === 'win32') {
      testCmd = 'powershell';
      const command = `(New-Object Media.SoundPlayer "${testFile.replace(/"/g, '""')}").PlaySync()`;
      const encoded = Buffer.from(command, 'utf16le').toString('base64');
      testArgs = ['-NoProfile', '-EncodedCommand', encoded];
    } else {
      return resolve({ success: false, reason: 'Unsupported platform' });
    }

    const child = spawn(testCmd, testArgs, { 
      stdio: 'ignore', 
      windowsHide: true 
    });
    
    let resolved = false;
    const safeResolve = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`${colorize('green', '✅ Native audio player works')}`);
        safeResolve({ success: true });
      } else {
        console.log(`${colorize('red', '❌ Native audio player failed with code ' + code)}`);
        safeResolve({ success: false, reason: `Exit code ${code}` });
      }
    });

    child.on('error', (error) => {
      console.log(`${colorize('red', '❌ Native audio player error: ' + error.message)}`);
      safeResolve({ success: false, reason: error.message });
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        child.kill();
        console.log(`${colorize('yellow', '⏰ Native audio test timed out')}`);
        safeResolve({ success: false, reason: 'Timeout' });
      }
    }, 5000);
  });
}

function testSystemBeep() {
  return new Promise((resolve) => {
    console.log(`\n${colorize('cyan', '🔔 Testing system beep...')}`);
    
    // Test system beep
    process.stdout.write('\x07');
    console.log(`${colorize('green', '✅ System beep sent (may be silent if terminal bell disabled)')}`);
    
    setTimeout(() => {
      resolve({ success: true });
    }, 500);
  });
}

function testMCPServer() {
  return new Promise((resolve) => {
    console.log(`\n${colorize('cyan', '🖥️  Testing MCP server...')}`);
    
    const serverPath = join(__dirname, 'server.js');
    if (!existsSync(serverPath)) {
      console.log(`${colorize('red', '❌ server.js not found')}`);
      return resolve({ success: false, reason: 'Server file missing' });
    }

    const child = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';
    let resolved = false;

    const safeResolve = (result) => {
      if (!resolved) {
        resolved = true;
        if (!child.killed) {
          child.kill();
        }
        resolve(result);
      }
    };

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      
      // Look for server startup message
      if (str.includes('PingMCP Server running')) {
        console.log(`${colorize('green', '✅ MCP server started successfully')}`);
        
        // Send test notification
        const testInput = createMCPTestInput();
        child.stdin.write(testInput);
        
        // Wait for response
        setTimeout(() => {
          if (output.includes(TEST_MESSAGE) || output.includes('Notification')) {
            console.log(`${colorize('green', '✅ MCP server responded correctly')}`);
            safeResolve({ success: true, output: output.trim() });
          } else {
            console.log(`${colorize('red', '❌ MCP server response missing or invalid')}`);
            console.log(`   Output: ${output.trim()}`);
            safeResolve({ success: false, reason: 'Invalid response', output });
          }
        }, 2000);
      }
    });

    child.on('error', (error) => {
      console.log(`${colorize('red', '❌ MCP server error: ' + error.message)}`);
      safeResolve({ success: false, reason: error.message });
    });

    child.on('close', (code) => {
      if (!resolved) {
        console.log(`${colorize('red', '❌ MCP server exited with code ' + code)}`);
        console.log(`   Error output: ${errorOutput.trim()}`);
        safeResolve({ success: false, reason: `Exit code ${code}` });
      }
    });

    // Timeout
    setTimeout(() => {
      if (!resolved) {
        console.log(`${colorize('yellow', '⏰ MCP server test timed out')}`);
        safeResolve({ success: false, reason: 'Timeout' });
      }
    }, TEST_TIMEOUT);
  });
}

function detectEnvironment() {
  const env = {
    os: OS,
    node: process.version,
    arch: process.arch,
    isWSL: !!process.env.WSL_DISTRO_NAME,
    isVM: false
  };

  // Detect if running in a VM
  if (OS === 'linux') {
    try {
      const dmidecode = spawn('dmidecode', ['-s', 'system-manufacturer'], { stdio: 'pipe' });
      dmidecode.stdout.on('data', (data) => {
        const manufacturer = data.toString().toLowerCase();
        if (manufacturer.includes('parallels') || manufacturer.includes('vmware') || 
            manufacturer.includes('virtualbox') || manufacturer.includes('qemu')) {
          env.isVM = true;
        }
      });
    } catch (e) {
      // dmidecode might not be available
    }
  }

  return env;
}

async function runFullTest() {
  console.log(colorize('magenta', '🚀 PingMCP Cross-Platform Test Suite'));
  console.log(colorize('magenta', '=====================================\n'));

  const env = detectEnvironment();
  console.log(`${colorize('blue', '📋 Environment:')}`);
  console.log(`   Platform: ${env.os} ${env.arch}`);
  console.log(`   Node.js: ${env.node}`);
  if (env.isWSL) console.log(`   WSL: ${process.env.WSL_DISTRO_NAME}`);
  if (env.isVM) console.log(`   Virtual Machine: Detected`);

  const results = {
    platform: env.os,
    nativeAudio: null,
    systemBeep: null,
    mcpServer: null
  };

  // Test 1: Native Audio
  try {
    results.nativeAudio = await testPlatformAudio();
  } catch (error) {
    results.nativeAudio = { success: false, reason: error.message };
  }

  // Test 2: System Beep
  try {
    results.systemBeep = await testSystemBeep();
  } catch (error) {
    results.systemBeep = { success: false, reason: error.message };
  }

  // Test 3: MCP Server
  try {
    results.mcpServer = await testMCPServer();
  } catch (error) {
    results.mcpServer = { success: false, reason: error.message };
  }

  // Summary
  console.log(`\n${colorize('magenta', '📊 Test Results Summary')}`);
  console.log(`${colorize('magenta', '=====================')}`);
  
  const tests = [
    { name: 'Native Audio', result: results.nativeAudio },
    { name: 'System Beep', result: results.systemBeep },
    { name: 'MCP Server', result: results.mcpServer }
  ];

  let passed = 0;
  tests.forEach(test => {
    const status = test.result.success ? 
      colorize('green', '✅ PASS') : 
      colorize('red', '❌ FAIL');
    console.log(`   ${test.name}: ${status}`);
    if (!test.result.success && test.result.reason) {
      console.log(`      Reason: ${test.result.reason}`);
    }
    if (test.result.success) passed++;
  });

  const overallStatus = passed === tests.length ? 
    colorize('green', '🎉 ALL TESTS PASSED') :
    colorize(passed > 0 ? 'yellow' : 'red', `⚠️  ${passed}/${tests.length} TESTS PASSED`);
  
  console.log(`\n${overallStatus}`);
  
  // Save results to file
  const resultsFile = join(__dirname, `test-results-${env.os}-${Date.now()}.json`);
  writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: env,
    results: results,
    summary: { passed, total: tests.length }
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  return { passed, total: tests.length, results };
}

// Instructions for cross-platform testing
function showCrossPlatformInstructions() {
  console.log(colorize('cyan', '\n🔄 Cross-Platform Testing with Parallels'));
  console.log(colorize('cyan', '=========================================='));
  console.log(`
${colorize('yellow', '1. macOS (current):')}
   npm run test-cross-platform

${colorize('yellow', '2. Linux VM:')}
   # Copy project to Linux VM
   scp -r pingmcp/ user@linux-vm:~/
   # SSH into Linux VM
   ssh user@linux-vm
   cd ~/pingmcp && npm install && npm run test-cross-platform

${colorize('yellow', '3. Windows VM:')}
   # Copy project to Windows VM via shared folder or scp
   # In Windows PowerShell:
   cd C:\\path\\to\\pingmcp
   npm install
   npm run test-cross-platform

${colorize('yellow', '4. Compare results:')}
   # Results are saved as test-results-{platform}-{timestamp}.json
   # Compare audio capabilities across platforms
`);
}

// Run tests
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showCrossPlatformInstructions();
} else {
  runFullTest().catch(error => {
    console.error(colorize('red', `❌ Test suite failed: ${error.message}`));
    process.exit(1);
  });
}