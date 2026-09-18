const { spawn } = require('child_process');

console.log('🚀 Starting public tunnel for Wayzyy WhatsApp Webhook...\n');

const lt = spawn('npx', ['-y', 'localtunnel', '--port', '5000'], { shell: true });

lt.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output.trim());
  
  const match = output.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);
  if (match) {
    const url = match[0];
    console.log('\n============================================================');
    console.log('🎉 TUNNEL IS LIVE & READY FOR META DEVELOPERS:');
    console.log(`🔗 Callback URL : ${url}/api/whatsapp/webhook`);
    console.log(`🔑 Verify Token : wayzyy_webhook_verify_2026`);
    console.log('============================================================\n');
    console.log('Paste the above Callback URL and Verify Token in Meta Dashboard!');
  }
});

lt.stderr.on('data', (data) => {
  console.error(data.toString());
});
