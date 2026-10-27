# Dijkstra's shortest path: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Audience: junior devs who've heard "Dijkstra" in a CS class or an interview prep list but never really got it.
Demo: codemotion/projects/dijkstra (graph.ts, dijkstra.ts, run.ts, heap.ts, dijkstra-heap.ts, bench.ts).
run-demo.sh reruns everything and saves the real output to public/code/dijkstra/terminal/.
The town map: A–B 4, A–C 2, B–C 1, B–D 5, C–D 8, C–E 10, D–E 2, D–F 6, E–F 3. Shortest A→F = 13.

---

## 1. Hook

[Maps app style: a pin at home, a pin at work, a route draws itself between them]
When you ask your maps app for a route, it has to find the fastest way through a road network with millions of intersections, and it does it in a fraction of a second. The idea behind that goes back to an algorithm from 1956, called Dijkstra's algorithm. It sounds scary, but the core of it is one really simple algo. So let's build it from scratch, step by step.

## 2. A map is a graph

[The town map morphs into six circles A–F connected by lines; numbers appear on each line]
First, we need to turn the map into something code can work with. So every intersection becomes a node, and every road becomes an edge between two nodes. And each edge gets a number or weight, which here is how many minutes that road takes. That's called a weighted graph.

[A glows "start", F glows "target"]
We start at A, and we want to get to F as fast as possible.

[graph.ts, buildGraph function focused, then the town list]
In code, I store it as an adjacency list. It's a map from each node to a list of its neighbours and the cost to get there. The roads go both ways, so every road gets added twice, once from each end.

## 3. Why it's not obvious

[A–B edge highlighted, "4"; then the route A–C–B highlighted, "2 + 1 = 3"]
Here's why this is trickier than it looks. From A, there's a direct road to B, and it takes 4 minutes. But if you go to C first, and then to B, that's 2 plus 1, so 3 minutes. The detour is faster. So you can't just look at the roads coming out of A and pick one. You have to keep track of the best time you've found so far to every node, and be ready to change your mind.

[Counter: number of possible routes ticking up fast as the graph grows]
And you also can't just try every possible route, because on a real map the number of routes explodes. Dijkstra gets the right answer without ever doing that.

## 4. The one rule

[A table appears next to the graph: one row per node, A = 0, everything else = ∞]
So here's the setup. We keep a table with the best known distance from A to every node. A is zero, because we're already there. Everything else is infinity, because we haven't found any way to get there yet.

[Two lines of text, one after the other: "1. Visit the closest unvisited node" / "2. Update its neighbours"]
And then we repeat two steps. One, pick the unvisited node with the smallest distance in the table, and visit it. Two, look at each of its neighbours, and ask, is going through this node faster than what I had before? If it is, update the table. That update has a name, it's called relaxing an edge. That's the whole algorithm.

## 5. Walking through it

[A visited (filled in); edges to B and C pulse; table: B ∞ → 4, C ∞ → 2]
Let's run it. The closest unvisited node is A, with zero. So we visit A. Its neighbours are B, at 4 minutes, and C, at 2. Both of those beat infinity, so B becomes 4 and C becomes 2.

[C visited; B 4 → 3 (struck through, the "via" arrow moves from A to C); D ∞ → 10; E ∞ → 12]
Now the closest unvisited node is C, at 2. From C, B is 2 plus 1, so 3. That's better than the 4 we had, so B drops to 3. There's our detour. D is 2 plus 8, so 10, and E is 2 plus 10, so 12.

[B visited; D 10 → 8]
Next closest is B, at 3. From B, D is 3 plus 5, which is 8. That beats 10, so D becomes 8.

[D visited; E 12 → 10; F ∞ → 14]
Then D, at 8. E through D is 8 plus 2, so 10, better than 12. And F finally gets a number, 8 plus 6, so 14.

[E visited; F 14 → 13]
Then E, at 10. F through E is 10 plus 3, 13. That beats 14.

[F visited; final table, every row filled]
And last, F, at 13. Every node is visited, and the table now holds the shortest time from A to everywhere, not just to F. That's a nice bonus of Dijkstra, you get all of them at once.

## 6. Why visiting the closest node works

[C highlighted as "closest", a dashed imaginary detour from another node loops back to C, labelled "≥ 2"]
So why can we trust a node's distance the moment we visit it? Because it's the closest unvisited node. Any other way to reach it would have to go through some other unvisited node first, and those are all already further away. Since roads can't take negative time, going further can never make the trip shorter. So the number is final.

[A road labelled "-5" appears and the logic visibly breaks; text: "negative weights → Bellman-Ford"]
And that's also the one catch. If your graph has negative weights, like a road that somehow gives you time back, Dijkstra can give you the wrong answer. For that you'd use a different algorithm, called Bellman-Ford. For maps, travel times are never negative, so we're fine.

## 7. Getting the actual route

[The table gains a "via" column: B via C, C via A, D via B, E via D, F via E]
Right now we know it takes 13 minutes, but not which roads to take. So whenever we update a node's distance, we also write down which node we came from. That's a second table, usually called prev.

[Starting at F, arrows hop backwards: F → E → D → B → C → A; then the list flips]
To get the route, you start at the target and follow those pointers backwards. F came from E, E from D, D from B, B from C, and C from A. Flip that around, and that's our path. A, C, B, D, E, F.

## 8. The code

[dijkstra.ts, focus the setup: dist, prev, visited, the Infinity loop]
Now let's write it. We have three things. dist is the table of distances, prev is where we came from, and visited is a set of the nodes we've finished. Every distance starts at infinity, except the start, which is zero.

[Focus step 1, the scan loop]
Then the main loop. Step one, we go through the table and find the unvisited node with the smallest distance. If the best we can find is infinity, the rest of the graph isn't reachable, so we stop.

[Focus step 2]
Step two, we mark it visited, so its distance is final.

[Focus step 3, the relax loop; the newDist line, then the if]
Step three, we relax every road out of it. The new distance is the current node's distance plus the cost of the road. If that's smaller than what the neighbour has, we update dist, and we update prev to say we came from here.

[pathTo function]
And this little function builds the route, exactly like we did by hand. Start at the target, keep stepping back through prev, and put each node at the front of the list.

[Terminal: 01-run.txt, lines appearing one by one, then the path line highlighted]
And if I run it, I added some logging so you can see each step. It visits A, then C, B drops from 4 to 3, and so on, exactly what we just did. And the path is A, C, B, D, E, F, in 13 minutes.

## 9. Making it fast

[Terminal: 02-bench.txt first two lines; a huge grid of nodes zooms out]
That works, but let's try it on something bigger. Here's a grid that's 150 by 150, so twenty two and a half thousand intersections, with random travel times on every road.

[The "simple scan" line appears with a slowly filling bar: about 51 seconds]
The simple version takes about 50 seconds. And the problem is step one. To find the closest node, we scan the whole table, every single round. That's twenty two thousand nodes, scanned twenty two thousand times, which is around half a billion checks. That's what people mean when they say it's O of n squared.

[A binary tree of [distance, node] pairs; the smallest sits on top]
The fix is a data structure called a min-heap, or a priority queue. It's a tree where the smallest item is always on top. Adding an item or taking the smallest one out only costs about log n steps, instead of scanning everything.

[heap.ts, push focused (bubble up), then pop focused (sink down)]
Here's a small one from scratch. Push adds the item at the bottom, and then swaps it upwards while its parent is bigger. Pop takes the top item, moves the last item up into its place, and then sinks it down while one of its children is smaller.

[dijkstra-heap.ts, Compare with dijkstra.ts: the scan loop is gone, heap.pop() in its place]
And the algorithm barely changes. Instead of scanning for the closest node, we just pop it off the heap. And whenever we find a better distance, we push the node onto the heap with its new distance.

[Focus the "stale entry" line]
There's one small trick here. A node can end up in the heap more than once, an old entry with a worse distance and a new one with a better distance. The better one comes out first, so when the old one comes out later, the node is already visited, and we just skip it.

[Terminal: the "min-heap" line appears: ~60 ms; the two bars side by side, same 769 min answer]
And now the same grid takes under a tenth of a second, instead of 50 seconds. Same answer, 769 minutes. The only thing that changed is how we find the closest node.

## 10. Recap

[Four cards appear: graph, distance table, closest node, min-heap]
So that's Dijkstra. Turn the map into a weighted graph. Keep a table of the best known distance to every node, starting at infinity. Keep visiting the closest unvisited node and relaxing its roads, and track where you came from so you can rebuild the path. Then use a min-heap so finding the closest node is fast. And real map apps build on exactly this, with extra tricks like A star, which points the search towards the destination so it doesn't have to explore the whole city.
