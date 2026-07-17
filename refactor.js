const fs = require('fs');
const path = require('path');

const srcDirs = ['mobile/app', 'mobile/components'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('colors') && !content.match(/\bcolors\b/)) return;
  if (!content.includes('import {') || !content.includes('design')) return;
  
  const originalContent = content;

  // Remove `colors` from design import
  content = content.replace(/(\bcolors\b\s*,\s*|\s*,\s*\bcolors\b)/g, '');
  content = content.replace(/import\s*\{\s*colors\s*\}\s*from\s*['"][^'"]*design['"];?\n?/g, '');
  
  if (content === originalContent && !content.includes('import { colors }')) return;

  // If useTheme is not imported, add it
  if (!content.includes('useTheme(')) {
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
    const relativePath = prefix + 'hooks/useTheme';
    
    // insert import after React imports
    content = 'import { useTheme } from "' + relativePath + '";\n' + content;
  }
  
  // inject const { colors } = useTheme(); into the main component function
  content = content.replace(/(export default function \w+\([^)]*\)\s*\{)/g, '$1\n  const { colors } = useTheme();\n');
  content = content.replace(/(export function \w+\([^)]*\)\s*\{)/g, '$1\n  const { colors } = useTheme();\n');
  content = content.replace(/(function \w+\([^)]*\)\s*\{)/g, '$1\n  const { colors } = useTheme();\n');
  
  // Fix double declarations if multiple components in file
  content = content.replace(/(const \{ colors \} = useTheme\(\);\s*){2,}/g, 'const { colors } = useTheme();\n');

  fs.writeFileSync(filePath, content);
  console.log('Updated', filePath);
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
