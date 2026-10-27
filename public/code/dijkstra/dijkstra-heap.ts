import type { Graph } from "./graph.ts";
import { MinHeap } from "./heap.ts";

// Same algorithm, but the heap hands us the closest node instead of a full scan.
export function dijkstraHeap(graph: Graph, start: string) {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  for (const node of graph.keys()) dist.set(node, Infinity);
  dist.set(start, 0);

  const heap = new MinHeap();
  heap.push([0, start]);

  while (heap.size > 0) {
    const [d, current] = heap.pop();
    if (visited.has(current)) continue; // stale entry, we already found better
    visited.add(current);

    for (const { to, cost } of graph.get(current)!) {
      const newDist = d + cost;
      if (newDist < dist.get(to)!) {
        dist.set(to, newDist);
        prev.set(to, current);
        heap.push([newDist, to]);
      }
    }
  }

  return { dist, prev };
}
