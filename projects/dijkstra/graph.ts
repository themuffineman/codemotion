// The little town map from the video. Each road is two-way, weight = minutes.
export type Graph = Map<string, { to: string; cost: number }[]>;

export function buildGraph(roads: [string, string, number][]): Graph {
  const graph: Graph = new Map();
  for (const [a, b, cost] of roads) {
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push({ to: b, cost });
    graph.get(b)!.push({ to: a, cost });
  }
  return graph;
}

export const town = buildGraph([
  ["A", "B", 4],
  ["A", "C", 2],
  ["B", "C", 1],
  ["B", "D", 5],
  ["C", "D", 8],
  ["C", "E", 10],
  ["D", "E", 2],
  ["D", "F", 6],
  ["E", "F", 3],
]);
