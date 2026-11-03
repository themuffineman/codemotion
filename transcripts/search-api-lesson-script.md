# How search APIs work (and a free one): script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: a lesson with no screen recordings. Everything on screen is diagrams, code from projects/serp, and the
real results from our test run on 2026-11-01. That run did 5 searches, got 10 results each in 1 to 2.6 seconds,
cost $0, and a repeat search came from the cache in 0.16 s instead of 1.7 s. A plain request to Google from code
got the "please turn on JavaScript" page instead of results. The scoring formula is from SearXNG's
searx/results.py (calculate_score).

---

[Agent loop diagram: model → tool call web_search("best running shoes for beginners") → ??? → results back into the context]
When an AI agent searches the web, what's really happening is a tool call. The model asks for a search, your code
sends that query somewhere, and a list of results comes back into the model's context. I build a lot of agents,
and the "somewhere" in the middle was the most expensive part of my whole setup, so I wanted to understand what
it's actually doing and whether I could run it myself.

[Counter: 1 blog post → 14 searches; 200 posts a day → 2,800 searches a day; → $60 to $120 a month]
I have agents that write blog posts, and each post makes about fourteen search calls and at the volume I was doing search was costing me sixty to a hundred and twenty
dollars a month. The model I was using was free, so search was the entire bill.

[A results page collapsing into JSON: { position, title, link, snippet }]
What the agent needs is a SERP API. SERP stands for search engine results page, and a SERP API takes a query and
returns that page as JSON, where each result has its position, the title, the link and a snippet. That's the
structure you can drop straight into a model's context.

[Code window: fetch("https://www.google.com/search?q=...") → response body: "Please turn on JavaScript"]
The obvious way to build one is to send an HTTP request to Google's search page and parse the HTML. When I tried
that with a plain request, Google didn't return any results at all, just a page telling me to turn on
JavaScript. And the engines that do answer plain requests start rate limiting you and showing CAPTCHAs once you
send enough of them, especially from the same IP address.

[The SERP API box opens up: a pool of servers, rotating IP addresses, a CAPTCHA solver, an HTML parser]
So that's what the paid SERP APIs are selling. They run a pool of servers, rotate through a lot of IP addresses
so no single one sends too many requests, deal with the CAPTCHAs, and parse the HTML into JSON for you. Each
search is a fraction of a cent, but agents make thousands of them.

[Diagram: one query → SearXNG → parallel requests to Google, Brave, Yahoo, Bing, DuckDuckGo, Qwant → one merged list]
The free alternative is SearXNG, which is an open source meta search engine. It doesn't have its own index. When
a query comes in, it sends it to a bunch of real search engines in parallel, parses each of their responses, and
merges them into one list. You host it yourself, and it's written in Python, so it runs fine on a laptop.

[Formula card: weight = number of engines that found it; score = sum of weight ÷ position, one term per engine]
The merging works like this. First it removes duplicates by URL, so if three engines returned the same page, it
becomes one result that remembers all three positions. Then it gives every result a score. The weight is how many
engines found it, and for each engine it adds that weight divided by the position that engine ranked it at.

[Worked example: result A found by 3 engines at positions 1, 2, 1 → 3/1 + 3/2 + 3/1 = 7.5; result B found by 1 engine at position 1 → 1/1 = 1]
So a page that three engines found at positions one, two and one scores seven and a half, while a page that only
one engine had at number one scores one. Agreement between engines counts for a lot. In my test, most of the top
results had been found by two or three engines, mostly Google, Brave and Yahoo.

[The fan-out diagram again; DuckDuckGo turns red with "CAPTCHA", Qwant turns red with "access denied"]
Running the queries in parallel also handles blocking. In my test, DuckDuckGo returned a CAPTCHA every time and
Qwant refused the request completely.

[JSON field: "unresponsive_engines": ["duckduckgo: CAPTCHA", "qwant: access denied"]; the merged list still fills to 10]
SearXNG marks those engines as unresponsive for that query and merges whatever the rest returned. So even with
two engines blocking me, all five searches came back with ten results, in one to three seconds. Each engine also
has a timeout, so a slow one gets dropped instead of holding up the whole response.

[Code window: searxng/settings.yml, highlight formats: [html, json] and the engines list]
The setup is one YAML file. By default SearXNG only serves HTML, so you add JSON to the output formats, and you
can switch on more engines than the defaults so there's more redundancy.

[Code window: src/search.ts, highlight the loop that builds organic_results]
To use it as a drop-in replacement for a paid API, I wrote a small TypeScript function that calls SearXNG's JSON
endpoint and maps each result to the same shape the paid APIs return, with organic results that have a position,
title, link and snippet. It also passes through the list of unresponsive engines, which is useful when a query
comes back with fewer results than you expected.

[Code window: src/server.ts, highlight the Map cache keyed by query; then timing bars 1.7 s → 0.16 s, "cached: true"]
Then there's a small HTTP server in front of it with a cache. It's an in-memory map keyed by the query, with a
one hour TTL. In my test the first request took 1.7 seconds and the same request again took 0.16. Every cache hit
is also a request that never reaches the engines, which keeps your request rate down and makes you a lot less
likely to get rate limited.

[Diagram: GitHub Actions job → docker run searxng → agents call localhost:8080 → job ends, container removed]
For my agents I don't run it permanently anywhere. They run on GitHub Actions, so the first step of each job
starts SearXNG as a container on the runner, the agents call it on localhost, and the container is removed when
the job finishes. GitHub Actions minutes are free for public repos and you get a free allowance on private ones,
so the searches don't cost anything.

[Flowchart: search → SearXNG → results? yes → use them; no → paid SERP API]
The catch is that search engines treat datacenter IP ranges much more strictly than home connections, so on
GitHub's runners some engines block you that work fine from a laptop. So I kept a paid API as a fallback, and the
agents only call it when SearXNG returns nothing. That rarely happens, so the bill went from up to a hundred and
twenty dollars a month to almost nothing.

[Recap strip, one icon per step: fan out in parallel → dedupe and score → drop blocked engines → map to SERP format → cache]
So that's the whole thing. Instead of paying someone to scrape one engine for you, you query lots of engines in
parallel, dedupe and score the results by how many engines agree, drop the ones that block you, map everything
into the standard SERP format, and cache it so you're sending as few requests as possible.

[Two columns: "Run your own" (free, plenty of searches, good results) · "Pay" (exact Google rankings, guaranteed uptime, huge volume from servers)]
If you need exact Google rankings, or guaranteed uptime at a really large volume, paying is probably still worth
it. But for agents and side projects, running your own is plenty. If you liked this one, I also made a video on
[fill in: one of your earlier videos, e.g. the algorithm behind Google Maps], which you might enjoy too.
