const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Cloudflare Tunnel for Wayzyy WhatsApp Webhook...\n');

// Detect cloudflared binary
let cmd = 'cloudflared';
const standardWinPath = 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe';
if (fs.existsSync(standardWinPath)) {
  cmd = standardWinPath;
}

const tunnel = spawn(cmd, ['tunnel', '--url', 'http://localhost:5000'], { stdio: ['ignore', 'pipe', 'pipe'] });

function handleOutput(data) {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    const url = match[0];
    console.log('\n============================================================');
    console.log('🎉 CLOUDFLARE TUNNEL IS LIVE & READY FOR META DEVELOPERS:');
    console.log(`🔗 Callback URL : ${url}/api/whatsapp/webhook`);
    console.log(`🔑 Verify Token : wayzyy_webhook_verify_2026`);
    console.log('============================================================\n');
    console.log('Paste the Callback URL and Verify Token in Meta Dashboard!');
    console.log('Keep this terminal open while testing.\n');
  }
}

tunnel.stdout.on('data', handleOutput);
tunnel.stderr.on('data', handleOutput);

tunnel.on('error', (err) => {
  console.error('Failed to start cloudflared:', err.message);
});

tunnel.on('exit', (code) => {
  console.log(`Tunnel closed (code ${code}).`);
});

// Keep node alive
process.on('SIGINT', () => {
  tunnel.kill();
  process.exit();
});
