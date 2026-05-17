const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /#E4C765/gi, to: '#C8B273' },
  { from: /#C9A844/gi, to: '#B89B5E' },
  { from: /#F1DE9D/gi, to: '#E8DDB8' },
  { from: /#F8EDCD/gi, to: '#F4ECD8' },
  { from: /#FDF9EF/gi, to: '#FDFCF9' },
  { from: /#FBF3DF/gi, to: '#F9F5EC' },
  { from: /228,199,101/g, to: '200,178,115' },
  { from: /228, 199, 101/g, to: '200, 178, 115' },
  { from: /#FFF9F6/gi, to: '#F8F4EE' },
  { from: /#FDF7F3/gi, to: '#F8F4EE' },
  { from: /#1E1E1E/gi, to: '#3B312C' },
  { from: /#5C5C5C/gi, to: '#6E625B' },
  { from: /#6B6B6B/gi, to: '#6E625B' },
  { from: /#8A8A8A/gi, to: '#B8A89A' },
  { from: /#AF9743/gi, to: '#C8B273' }, // Logo text color
  // Avoid changing actual Tailwind white/black
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
