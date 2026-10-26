// Work out a file's Git hash ourselves: SHA-1 of "blob <size>\0<content>".
// Usage: node hash-object.js <file>
import fs from 'node:fs';
import crypto from 'node:crypto';

const content = fs.readFileSync(process.argv[2]);
const object = Buffer.concat([Buffer.from(`blob ${content.length}\0`), content]);

console.log(crypto.createHash('sha1').update(object).digest('hex'));
