import { town } from "./graph.ts";
import { dijkstra, pathTo } from "./dijkstra.ts";

const { dist, prev } = dijkstra(town, "A", true);

console.log("");
console.log("distances:", Object.fromEntries(dist));
console.log("path A -> F:", pathTo(prev, "F").join(" -> "), `(${dist.get("F")} min)`);
