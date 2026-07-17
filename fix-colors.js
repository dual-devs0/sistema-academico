const fs = require('fs');
const path = require('path');

const srcDirs = ['mobile/app', 'mobile/components'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('colors') || content.includes('import { colors }') || content.includes('import {colors}')) return;
  if (!content.match(/\bcolors\b/)) return;
  
  // also if useTheme() exports colors and it's already there, we might not need it for those places, but we need it globally if there are errors.
  const isApp = filePath.includes('mobile\\app') || filePath.includes('mobile/app');
  const isComp = filePath.includes('mobile\\components') || filePath.includes('mobile/components');
  
  let depth = 0;
  if (isApp) {
    const parts = filePath.split(/[\\\/]app[\\\/]/)[1].split(/[\\\/]/);
    depth = parts.length;
  } else if (isComp) {
    const parts = filePath.split(/[\\\/]components[\\\/]/)[1].split(/[\\\/]/);
    depth = parts.length;
  }
  
  const prefix = depth === 1 ? '../' : '../'.repeat(depth);
  const relativePath = prefix + 'constants/design';
  
  // insert import at the top
  content = 'import { colors } from "' + relativePath + '";\n' + content;
  fs.writeFileSync(filePath, content);
  console.log('Restored colors import in', filePath);
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

srcDirs.forEach(walk);
