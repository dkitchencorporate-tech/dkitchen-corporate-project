const { spawnSync } = require('child_process');

const token = 'architect_sys_2026';
const result = spawnSync('npx', ['vercel', 'env', 'add', 'WHATSAPP_VERIFY_TOKEN', 'production', '--force', '--scope', 'architect-sys-projects'], {
  input: token,
  encoding: 'utf-8',
  shell: true
});

console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);
console.log('STATUS:', result.status);
