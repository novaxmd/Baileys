const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');
const EXT_RE = /\.(js|json|cjs|mjs|d\.ts)$/;
const IMPORT_RE = /(from\s+['"])(\.[^'"]+?)(['"]\s*;?)/g;

let fixed = 0;

function resolveImportPath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    const abs = path.resolve(fromDir, importPath);
    if (fs.existsSync(abs + '.js')) return importPath + '.js';
    if (fs.existsSync(path.join(abs, 'index.js'))) return importPath + '/index.js';
    return importPath + '.js';
}

function processFile(fpath) {
    const content = fs.readFileSync(fpath, 'utf8');
    const patched = content.replace(IMPORT_RE, (m, pre, p, suf) => {
        if (EXT_RE.test(p)) return m;
        const resolved = resolveImportPath(fpath, p);
        if (resolved !== p) fixed++;
        return pre + resolved + suf;
    });
    if (patched !== content) fs.writeFileSync(fpath, patched);
}

function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) { walk(full); continue; }
        if (entry.endsWith('.js') || entry.endsWith('.d.ts')) processFile(full);
    }
}

walk(libDir);
console.log('fix-esm: patched', fixed, 'import paths');
