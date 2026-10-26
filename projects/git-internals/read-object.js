// Read an object straight out of .git/objects and print what's really inside.
// Usage: node read-object.js <hash>
import fs from 'node:fs';
import zlib from 'node:zlib';

const hash = process.argv[2];
const file = `.git/objects/${hash.slice(0, 2)}/${hash.slice(2)}`;

const raw = zlib.inflateSync(fs.readFileSync(file)); // every object is just zlib-compressed
console.log(raw.toString().replaceAll('\0', '\\0')); // show the null byte after the header
