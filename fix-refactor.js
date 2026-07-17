const fs = require('fs');
const path = require('path');

const srcDirs = ['mobile/app', 'mobile/components'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('useTheme(') && !content.includes('import { useTheme }')) return;
  
  const originalContent = content;

  // Find all function declarations that don't have const { colors } = useTheme();
  // We'll use a regex that matches `function Name(args) {`
  content = content.replace(/(function\s+[a-zA-Z0-9_]+\s*\([\s\S]*?\)\s*\{)(?!\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\);)/g, '$1\n  const { colors } = useTheme();');

  // Find all arrow function components exported: export const Name = (...) => {
  content = content.replace(/(export\s+(?:const|let|var)\s+[a-zA-Z0-9_]+\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{)(?!\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\);)/g, '$1\n  const { colors } = useTheme();');
  
  // also regular arrow functions const Name = (...) => {
  content = content.replace(/(const\s+[a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)(?!\s*const\s*\{\s*colors\s*\}\s*=\s*useTheme\(\);)/g, '$1\n  const { colors } = useTheme();');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

srcDirs.forEach(walk);
