import { buildGraph } from "./graph.ts";
import { dijkstra } from "./dijkstra.ts";
import { dijkstraHeap } from "./dijkstra-heap.ts";

// A city-sized grid: 150 x 150 intersections, random travel times 1-9.
const N = 150;
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const roads: [string, string, number][] = [];
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (x + 1 < N) roads.push([`${x},${y}`, `${x + 1},${y}`, 1 + Math.floor(rand() * 9)]);
    if (y + 1 < N) roads.push([`${x},${y}`, `${x},${y + 1}`, 1 + Math.floor(rand() * 9)]);
  }
}
const city = buildGraph(roads);
const target = `${N - 1},${N - 1}`;
console.log(`${city.size} intersections, ${roads.length} roads`);

let t = performance.now();
const a = dijkstra(city, "0,0");
console.log(`simple scan: ${Math.round(performance.now() - t)} ms  ->  ${a.dist.get(target)} min`);

t = performance.now();
const b = dijkstraHeap(city, "0,0");
console.log(`min-heap:    ${Math.round(performance.now() - t)} ms  ->  ${b.dist.get(target)} min`);
