const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'lib/i18n/translations.ts'), 'utf8');

// A simple parser to find keys inside en: { ... } and am: { ... }
function getKeys(blockName) {
  const startIndex = content.indexOf(`${blockName}: {`);
  if (startIndex === -1) return [];
  
  // Find matching closing brace
  let braceCount = 1;
  let i = startIndex + `${blockName}: {`.length;
  let blockText = '';
  
  while (i < content.length && braceCount > 0) {
    const char = content[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount > 0) {
      blockText += char;
    }
    i++;
  }
  
  // Extract keys using regex (words followed by colon or "key":)
  const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:/gm;
  const keys = [];
  let match;
  while ((match = keyRegex.exec(blockText)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

const enKeys = getKeys('en');
const amKeys = getKeys('am');

const missingInAm = enKeys.filter(k => !amKeys.includes(k));
const missingInEn = amKeys.filter(k => !enKeys.includes(k));

console.log('EN Keys Count:', enKeys.length);
console.log('AM Keys Count:', amKeys.length);
console.log('Missing in am:', missingInAm);
console.log('Missing in en:', missingInEn);
