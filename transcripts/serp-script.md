# Homemade SERP API: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: why paid search adds up, then what SearXNG is, then setting it up, then the API we put in front of it
(file by file), then the demo, then running it for free on GitHub Actions.
Project: projects/serp. The numbers are from the real demo run on 2026-11-01 (SearXNG run with start-searxng.sh).

Screenshots to take:
- serp-01-serpapi-pricing.png: SerpApi's pricing page
- serp-02-searxng-github.png: the SearXNG GitHub repo
- serp-03-searxng-docs-engines.png: SearXNG docs, the list of engines
- serp-04-searxng-ui.png: our SearXNG in the browser at localhost:8080 with a search done
- serp-05-json.png: the same search with &format=json in the browser

---

## 1. Intro

[Title: "My own Google results API"; a JSON block of search results scrolling]
In this video we're going to build our own search results API. You send it a search, and it sends back the
top results as JSON, with the titles, the links and the snippets, the same way the paid ones do. Except this
one runs on your own machine and costs nothing per search.

## 2. Why

[Screenshot: serp-01-serpapi-pricing.png, highlight the monthly plans]
If you're building anything with AI agents, they need to search the web, and the usual way to do that is a
SERP API like SerpApi or Serper. They work well, but you pay for every search.

[Counter: 1 post → 14 searches → 200 posts a day → about 2,800 searches a day]
I ran into this with my own content agents. Every blog post they write does about fourteen searches, and I
want them writing a hundred to two hundred posts a day. Even at around a tenth of a cent per search, that's
sixty to a hundred and twenty dollars a month, and the model I was using was free, so search was the whole
bill.

[Big "$0" replacing the monthly number]
So I moved it onto my own search engine, and that's what we're building today.

## 3. What SearXNG is

[Screenshot: serp-02-searxng-github.png]
The thing doing the heavy lifting is SearXNG. It's a free, open source search engine that you host yourself.
It doesn't have its own index of the web. When you search, it asks a bunch of other search engines at the same
time, like Bing, DuckDuckGo and Startpage, and merges what they all send back into one list.

[Diagram: our query → SearXNG → Bing, DuckDuckGo, Startpage, Yahoo, Qwant, Mojeek → merged list]
That's also why it holds up well. If one engine is slow or blocks you, SearXNG just leaves it out and uses the
rest, so you still get results.

## 4. Setting it up

[Code window: docker-compose.yml]
The easiest way to run it is with Docker. This compose file pulls the official SearXNG image, opens it on port
8080, and points it at a folder with our settings in it. I also gave it a memory limit, because it doesn't need
much and my laptop doesn't have much.

[Code window: searxng/settings.yml, highlight formats: [html, json]]
And this is the settings file. The most important line is this one. By default SearXNG only gives you a web
page, so we turn on JSON as well, because that's what our code is going to read.

[Highlight limiter: false and the secret key]
We also switch off its rate limiter, because the only one using it is us, and it's only reachable from this
machine, so the secret key doesn't need to be anything special.

[Highlight the engines list]
Then down here we switch on a few more engines than the defaults, so there's always something answering.

[Terminal: docker compose up -d; then the container shows as running]
Then it's one command, docker compose up, and it's running.

[Code window: start-searxng.sh; then the terminal: bash start-searxng.sh, "Serving Flask app"]
My laptop can't run Docker, so I'm running it straight from Python instead, and I wrote a small script for that.
The first time, it downloads SearXNG and installs what it needs, and then it starts it with the same settings
file. On Windows there's one little catch. SearXNG imports a module that only exists on Linux and Mac, so we give
it a tiny stand-in file, and then it runs fine.

[Screenshot: serp-04-searxng-ui.png]
If you open localhost 8080 in the browser, you've got your own search engine, and you can already search with
it.

[Screenshot: serp-05-json.png, highlight results, url, title, content, engines]
And if you add format equals json to the address, you get the same results as data. Every result has the URL,
the title, a snippet, and which engines found it.

## 5. The API: search.ts

[Code window: src/search.ts]
Now we'll put a small API in front of it, so it looks just like the paid ones. That way anything you already
built for SerpApi works with yours.

[Highlight the URL building]
The search function builds the SearXNG address with our query and asks for JSON.

[Highlight the for loop]
Then we go through the results and turn each one into the shape the paid APIs use, with a position, the
title, the link, the domain on its own, and the snippet with the extra spaces cleaned up. We stop once we have
as many as were asked for.

[Highlight unresponsive_engines]
We also pass along which engines didn't answer this time and why, which is really handy when you're working out
why a search came back thin.

## 6. The API: server.ts

[Code window: src/server.ts]
Then the server. It's plain Node with no framework. There's one route, slash search, and it takes the query,
how many results you want, and an API key.

[Highlight the api_key check]
The key check is there so if you ever put this on the internet, random people can't use your search engine.

[Highlight the cache]
And this part is a cache. If the same search comes in again within an hour, we send back what we got last time
straight from memory. That makes repeat searches instant, and it means we're asking the engines less, which
keeps us from getting blocked.

## 7. Trying it

[Terminal: npm run demo; results print for five queries]
So let's run the demo. It does five different searches and prints the top results, which engines found each
one, and how long it took. Every search came back with ten results, and they took between one and three seconds.

[Highlight the engine tags on a result: [yahoo, google cse, brave]; then the "didn't answer" line]
You can see most results were found by more than one engine, mainly Google, Brave and Yahoo. And down here it
tells us DuckDuckGo wanted a CAPTCHA and Qwant blocked us, but because the others answered, we didn't miss
anything.

[Terminal: npm run server, then curl /search?q=...; JSON scrolls]
And here's the server. I send it a search, and the results come back in the same format as SerpApi.

[Same curl again; "cached": true; timings side by side: 1.7 s → 0.16 s]
If I send exactly the same search again, it comes straight from the cache, so it took about a tenth of the time.

[Counter: 50 results · 5 searches · $0.00]
And all of that cost nothing.

## 8. Running it for free in the cloud

[Code window: a GitHub Actions workflow step: docker run searxng ... then the agent step with SEARXNG_URL]
For my content agents I don't even run it on my laptop. They run on GitHub Actions, so at the start of each job
I start SearXNG as a container on the runner, the agents search through it, and when the job ends it's gone.
GitHub gives you those minutes for free, so the search is free too.

[Pill: "From cloud servers, some engines block"]
One thing to know is that some engines are stricter with cloud servers than with a home connection. From
GitHub's servers I found that Bing, Yahoo and Google's custom search answered, and Brave, DuckDuckGo and
Qwant blocked. Because SearXNG skips whatever doesn't answer, that's still enough.

[Diagram: search → SearXNG → results? yes → use them; no → paid API]
And if you want to be safe, keep a paid API as a fallback. My agents only use the paid one when SearXNG comes
back empty, so it costs almost nothing.

## 9. Outro

[Repo card; CTA]
The code is linked in the description. Be reasonable with how hard you hit the engines and keep the cache on.
Let me know in the comments what you'd plug your own search engine into.
