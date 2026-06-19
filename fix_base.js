const fs = require('fs');
const path = require('path');

// 1. Overwrite client.js with base.js
const apiDir = path.join(__dirname, 'src', 'api');
const baseContent = fs.readFileSync(path.join(apiDir, 'base.js'), 'utf8');
fs.writeFileSync(path.join(apiDir, 'client.js'), baseContent, 'utf8');

// 2. Delete base.js
fs.unlinkSync(path.join(apiDir, 'base.js'));

// 3. Update all Api modules
const files = fs.readdirSync(apiDir);
for (const file of files) {
  if (file.endsWith('Api.js')) {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/from '\.\/base'/g, "from './client'");
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Fixed base -> client');
