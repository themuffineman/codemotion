import type { Graph } from "./graph.ts";

// Simple version: scan for the closest unvisited node each round.
export function dijkstra(graph: Graph, start: string, log = false) {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  for (const node of graph.keys()) dist.set(node, Infinity);
  dist.set(start, 0);

  while (visited.size < graph.size) {
    // 1. pick the unvisited node with the smallest distance
    let current: string | null = null;
    for (const [node, d] of dist) {
      if (visited.has(node)) continue;
      if (current === null || d < dist.get(current)!) current = node;
    }
    if (current === null || dist.get(current) === Infinity) break;

    // 2. its distance is final now
    visited.add(current);
    if (log) console.log(`visit ${current} (${dist.get(current)})`);

    // 3. relax every road out of it
    for (const { to, cost } of graph.get(current)!) {
      if (visited.has(to)) continue;
      const newDist = dist.get(current)! + cost;
      if (newDist < dist.get(to)!) {
        if (log) console.log(`  ${to}: ${dist.get(to)} -> ${newDist} via ${current}`);
        dist.set(to, newDist);
        prev.set(to, current);
      }
    }
  }

  return { dist, prev };
}

// Walk the prev pointers backwards from the target, then flip.
export function pathTo(prev: Map<string, string>, target: string) {
  const path = [target];
  while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
  return path;
}
