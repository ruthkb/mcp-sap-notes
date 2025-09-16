import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing SAP Note Attachments Tool...\n');

const serverProcess = spawn('node', [join(__dirname, '..', 'dist/mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, HEADFUL: 'true', LOG_LEVEL: 'debug' }
});

// Handle server logs (stderr)
serverProcess.stderr.on('data', (data) => {
  console.log('📋 Server Log:', data.toString().trim());
});

// Handle server responses (stdout)
let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line.trim());
        console.log('📤 Server Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📋 Server Output:', line.trim());
      }
    }
  }
});

function sendMessage(message) {
  const messageStr = JSON.stringify(message);
  console.log('📥 Sending:', JSON.stringify(message, null, 2));
  serverProcess.stdin.write(messageStr + '\n');
}

// Test sequence
setTimeout(() => {
  console.log('🔧 Step 1: Initialize MCP server...');
  sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  });
}, 1000);

setTimeout(() => {
  console.log('🔧 Step 2: Send initialized notification...');
  sendMessage({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  });
}, 3000);

setTimeout(() => {
  console.log('🔧 Step 3: Test attachments tool...');
  sendMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'sap_note_attachments',
      arguments: {
        id: '2744792'
      }
    }
  });
}, 5000);

setTimeout(() => {
  console.log('\n✅ Test completed. Shutting down server...');
  serverProcess.kill();
}, 30000);

serverProcess.on('exit', (code) => {
  console.log(`📋 Server process exited with code ${code}`);
});