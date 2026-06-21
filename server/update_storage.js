import fs from 'fs';
import path from 'path';

const files = [
  '../frontend/src/api/client.js',
  '../frontend/src/api/authApi.js',
  '../frontend/src/api/analyticsApi.js',
  '../frontend/src/context/AuthContext.jsx',
  '../frontend/src/pages/Profile.jsx'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/localStorage/g, 'sessionStorage');
  fs.writeFileSync(fullPath, content);
  console.log('Updated', file);
});
