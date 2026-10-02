import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Local CLI transport only. Never loads application environment or credentials.
const dir = resolve('storage/playcanvas-mcp');
mkdirSync(dir, { recursive: true });
const child = spawn('cmd.exe', ['/d', '/s', '/c', 'npx -y @playcanvas/editor-mcp-server'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});
let buffer = '';
let ready = false;
const sent = new Set();
const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
child.stderr.on('data', (data) => process.stderr.write(data));
child.stdout.on('data', (data) => {
  buffer += data;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    try {
      const response = JSON.parse(line);
      if (response.id === 1) {
        send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        ready = true;
      }
      if (response.id) {
        writeFileSync(
          resolve(dir, `response-${response.id}.json`),
          JSON.stringify(response, null, 2),
        );
        console.log(`MCP response ${response.id} saved`);
      }
    } catch {
      console.log(line);
    }
  }
});
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'angi-local-cli', version: '1.0' },
  },
});
setInterval(() => {
  const queue = resolve(dir, 'requests.json');
  if (!ready || !existsSync(queue)) return;
  try {
    for (const request of JSON.parse(readFileSync(queue, 'utf8'))) {
      if (
        request.id <= 1 ||
        sent.has(request.id) ||
        existsSync(resolve(dir, `response-${request.id}.json`))
      )
        continue;
      sent.add(request.id);
      send({ jsonrpc: '2.0', ...request });
    }
  } catch (error) {
    console.error(error.message);
  }
}, 500);
process.on('SIGINT', () => {
  child.kill();
  process.exit();
});
child.on('exit', (code) => process.exit(code ?? 0));
