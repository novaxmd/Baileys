const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const EXT_RE = /\.(js|json|cjs|mjs|d\.ts)$/;
const IMPORT_RE = /((?:from|import)\s+['"])(\.[^'"]+?)(['"]\s*;?)/g;

let fixed = 0;

function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) { walk(full); continue; }
        if (!entry.endsWith('.js') && !entry.endsWith('.d.ts')) continue;
        const content = fs.readFileSync(full, 'utf8');
        const patched = content.replace(IMPORT_RE, (m, pre, p, suf) => {
            if (EXT_RE.test(p)) return m;
            fixed++;
            return pre + p + '.js' + suf;
        });
        if (patched !== content) fs.writeFileSync(full, patched);
    }
}

walk(libDir);
console.log('fix-esm: patched', fixed, 'import paths');
