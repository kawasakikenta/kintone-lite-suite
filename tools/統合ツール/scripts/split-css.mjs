import fs from 'fs';
import path from 'path';

const cssContent = fs.readFileSync('src/ui/styles.css', 'utf8');
const lines = cssContent.split('\n');

const files = {
  'tokens.css': [],
  'base.css': [],
  'components.css': [],
  'diff.css': [],
  'reflect.css': [],
  'tabs.css': [],
  'utilities.css': []
};

let currentFile = 'base.css';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('/* === Design tokens')) currentFile = 'tokens.css';
  else if (line.includes('/* === Unified button')) currentFile = 'components.css';
  else if (line.includes('/* === Diff hero')) currentFile = 'diff.css';
  else if (line.includes('/* ========== Section Preview Editor')) currentFile = 'reflect.css';
  else if (line.includes('/* ========== Analyze Tab Styles')) currentFile = 'tabs.css';
  else if (line.includes('/* =================================================================')) {
     if (currentFile !== 'tabs.css') currentFile = 'utilities.css';
  }

  files[currentFile].push(line);
}

for (const [name, content] of Object.entries(files)) {
  if (content.length > 0) {
    fs.writeFileSync(`src/ui/styles/${name}`, content.join('\n'));
    console.log(`Created ${name}: ${content.length} lines`);
  }
}
