const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /#E9897E/gi, to: '#E4C765' },
  { from: /#C86B5F/gi, to: '#C9A844' },
  { from: /#F4B5AD/gi, to: '#F1DE9D' },
  { from: /#F8D5D0/gi, to: '#F8EDCD' },
  { from: /#FFF0EE/gi, to: '#FDF9EF' },
  { from: /#FFE0DC/gi, to: '#FBF3DF' },
  { from: /233,137,126/g, to: '228,199,101' },
  { from: /233, 137, 126/g, to: '228, 199, 101' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { from, to } of replacements) {
        if (content.match(from)) {
          content = content.replace(from, to);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

const dirs = [
  path.join(__dirname, 'components'),
  path.join(__dirname, 'app'),
  path.join(__dirname, 'lib')
];

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}

console.log('Replacement complete.');
