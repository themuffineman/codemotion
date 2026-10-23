// Downloads a brand logo from svgl.app (free SVG logos for most tech companies) into public/logos/.
// usage: node scripts/logo.mjs <search> [slug]
//   node scripts/logo.mjs remotion         -> public/logos/remotion.svg
//   node scripts/logo.mjs "web services" aws -> public/logos/aws.svg
// Logos with light/dark versions: the dark version is saved (it reads on the charcoal stage).
// Search tips: "aws" finds nothing, search "amazon"; browse https://svgl.app when unsure.
import fs from 'node:fs';

const [query, slugArg] = process.argv.slice(2);
if (!query) throw new Error('usage: node scripts/logo.mjs <search> [slug]');
const res = await fetch(`https://api.svgl.app?search=${encodeURIComponent(query)}`);
const hits = await res.json();
if (!Array.isArray(hits) || hits.length === 0) throw new Error(`svgl.app has nothing for "${query}"`);
console.log('matches:', hits.slice(0, 5).map((h) => h.title).join(', '));

// Prefer an exact title match, otherwise the first hit.
const hit = hits.find((h) => h.title.toLowerCase() === query.toLowerCase()) ?? hits[0];
const url = typeof hit.route === 'string' ? hit.route : hit.route.dark;
const svg = await (await fetch(url)).text();
const slug = slugArg ?? hit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
fs.mkdirSync('public/logos', {recursive: true});
fs.writeFileSync(`public/logos/${slug}.svg`, svg);
console.log(`${hit.title} -> public/logos/${slug}.svg`);
