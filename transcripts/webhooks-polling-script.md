# Webhooks vs polling: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Audience: junior devs. They know HTTP, endpoints, JSON and status codes, so use the real terms.
Advanced concepts (at-least-once, idempotency, HMAC, replay attacks, constant-time) get named
AND explained in one plain sentence the first time they come up.
Demo code: codemotion/projects/webhooks-vs-polling (plain Node, no dependencies).
Real terminal output: public/code/webhooks-polling/terminal/ (all runs done 2026-10-24).
The provider is fake on purpose ("Payly"), modelled on how Stripe signs and retries webhooks.

---

## 1. Hook

[Two lanes: client → server "status?" on a loop | server → client one POST]
When your app depends on another service, like a payment provider, you need some way to know when something changes on their side. There are two ways to do that. Your app can poll, so it keeps calling their API and asking for the current status, or their server can call you, it sends an HTTP request to your app the moment the event happens, and that's a webhook. Polling is simple but wasteful. Webhooks are way more efficient, but the first version most people write has a few bugs that only show up in production. So in this video we'll build both, break the webhook, and fix it properly.

## 2. The setup

[Diagram: "your app" ↔ "Payly" provider; Stripe logo faded behind Payly]
For the demo I wrote a small fake payment provider, kind of a tiny Stripe. You create a payment, it stays pending for about six seconds, and then it changes to succeeded. Our app needs to react to that change, because that's when we send the receipt or fulfil the order.

[provider.js, the POST /payments and GET /payments/:id handlers]
It has two endpoints. A POST to create a payment, and a GET by id that returns the payment's current status.

## 3. Polling

[poll.js, whole file, focus the while loop]
Polling is just a loop. We create the payment, then call the GET endpoint every second until the status is succeeded.

[Terminal: poll.txt, lines appear one by one]
If I run it, it takes seven requests. The first six all came back pending, so they were basically wasted.

[Chart: interval on the x-axis; latency line going up, request count going down]
And this is the real problem with polling. You have to pick an interval, and either choice costs you something. Poll every second and you're sending tons of requests that mostly come back with nothing new, and a lot of APIs will rate limit you for that. Poll every minute and your user might wait a whole minute for their receipt. So you're always trading speed for load.

[Compare: polling = you ask, over and over | webhook = they tell you, once]
A webhook flips the direction. You give the provider a URL in your app, and when the status changes, they send a POST request to that URL with an event that says what happened. So it's one request, and it arrives right when the event happens.

## 4. The naive webhook

[webhook-naive.js, whole file]
This is the webhook handler most people write first. It's a simple HTTP server. It reads the request body, parses the JSON, and if the event type is payment succeeded, it sends the receipt. Then it responds with a two hundred to say we got it.

[work.js, focus the 5 second wait]
The receipt part stands in for real work, like calling an email API or writing to the database. I made it take five seconds.

[Terminal: curl -X POST localhost:4000/payments, then naive-app.txt next to naive-provider.txt, lines appear in time order]
So I create a payment and wait. It succeeds, the provider sends the event, and look at the provider's logs. Attempt one failed, timeout. Then attempt two, three and four. And on our app's side, the receipt email was sent four times, for one payment.

[Timeline: provider POST → 3s timeout → retry with backoff; the app's handler keeps running and finishes at 5s each time]
So what happened? The provider only waits a few seconds for your app to respond with a two-xx status. Our handler was doing the slow work before responding, so it didn't answer in time, and the provider marked the delivery as failed. So it retried, and waited a bit longer between each try, which is called backoff. But the timeout only happened on their side. Our server didn't know they gave up, so it finished the work every single time.

[Card: "at-least-once delivery"]
And this is the important idea here. Webhook providers promise at-least-once delivery. That means they'll make sure you get every event, but if they're not sure you got it, they'll send it again. So you can't assume each event arrives exactly once, and your code has to handle that.

## 5. Fix one: respond first, do the work after

[webhook.js, the createServer handler, focus queue.push and writeHead(200)]
The first fix is to separate responding from doing the work. In the new handler, we just put the event on a queue and send back a two hundred straight away. That takes a few milliseconds, so we never hit the timeout.

[webhook.js, the worker function]
Then a background worker takes events off the queue and does the slow part. To keep the demo short, the queue here is just an array in memory. The problem with that is if the server crashes, those events are gone. In a real app you'd use a proper job queue, or at least save the event to your database before you respond.

## 6. Fix two: make it idempotent

[provider.js, the DUPLICATE line highlighted]
Even when you respond fast, you'll still get duplicates sometimes, because of network issues or the provider's own retries. Stripe's docs actually say your endpoint might receive the same event more than once. So I made my fake provider do that on purpose.

[webhook.js, the processed Set and the "already handled" check]
The fix is to make your handler idempotent. That just means handling the same event twice has the same result as handling it once. Every event has a unique id, so before doing anything, we check if we've already seen that id. If we have, we skip it. Here I'm using a Set. In a real app you'd use a database table with a unique constraint on the event id, so even if two workers grab the same event at the same time, only one insert succeeds.

[webhook.js, processed.add before sendReceiptEmail]
One thing to think about is when you save the id. I save it before doing the work, so if sending the email fails, that event is lost and never retried. If you save it after, a crash in the middle means the work runs twice. For a receipt email, losing one is better than sending two. But for anything with money, you want the work itself to be safe to run twice.

[Terminal: fixed-provider.txt next to fixed-app.txt]
And if we run it again, the provider sends the same event twice, we respond to both right away, one email goes out, and the second one gets skipped as already handled.

## 7. Fix three: verify the signature

[Diagram: public webhook URL; Payly arrow and an attacker arrow both pointing at it]
Last fix, and this one's about security. Your webhook URL is public, and there's no login on it. So anyone who finds it can send a fake payment succeeded event, and right now our handler would send a receipt and fulfil an order that nobody paid for.

[provider.js, the sign function]
That's why providers sign their requests. When you set up the webhook, they give you a secret key that only you and they know. For every request, they take the timestamp and the body and run them through HMAC SHA-256 with that secret. HMAC is basically a hash that you can only produce if you know the secret. They put the result in a header.

[webhook.js, the isValid function, focus the createHmac line]
On our side, we do the exact same calculation with our copy of the secret and compare the two. If they match, we know the request really came from the provider, and that nobody changed the body on the way.

[webhook.js, the "older than 5 minutes" line]
The timestamp is there to stop replay attacks. That's when someone captures one real request and just sends it again later. Since the timestamp is part of the signature, they can't change it, so we reject anything older than five minutes.

[webhook.js, the timingSafeEqual line]
And we compare using timingSafeEqual instead of a normal equals check. A normal comparison stops at the first character that doesn't match, so a wrong guess that's almost right takes a tiny bit longer. In theory an attacker can measure that and guess the signature piece by piece. timingSafeEqual always takes the same amount of time, so there's nothing to measure.

[webhook.js, the "raw body" comment]
One mistake a lot of people make: you have to check the signature against the raw body, exactly as it arrived. If your framework parses the JSON for you and you turn it back into a string, the spacing or key order can change, and the signature won't match anymore. In Express, for example, you'd use the raw body parser on the webhook route.

[Terminal: forged-curl.txt (400) and the "rejected: bad signature" line]
So now if I send a fake event with a made-up signature, it gets a four hundred, and nothing runs.

## 8. Polling still has a job

[Diagram: webhooks as the main path; a scheduled reconciliation job polling the API as a safety net]
Now, that doesn't mean polling is useless. Some APIs don't offer webhooks at all, and sometimes your server is behind a firewall that can't accept requests from outside, so polling is your only choice. And even with webhooks, events can still get lost. Maybe your server was down for a few hours and the provider gave up retrying. So a lot of real systems use both. Webhooks handle events in real time, and a scheduled job polls the API every so often to catch anything that was missed. That's called reconciliation.

## 9. Testing locally

[Diagram: provider on the internet → can't reach localhost → tunnel (ngrok logo / provider CLI) → localhost:3000]
One practical tip. When you're building this on your laptop, a real provider can't reach localhost. So you use a tunnel. ngrok gives you a public URL that forwards requests to your machine. Some providers also have their own CLI for it, like stripe listen, which sends events straight to your local server.

## 10. Recap and outro

[Three cards: respond fast, work async · skip duplicate event ids · verify the signature on the raw body; then the polling vs webhook compare]
So, polling is simple, but you're always trading speed for wasted requests. It's still useful as a fallback. For events, use webhooks, and remember they're delivered at least once. Respond fast and do the work in the background, skip events you've already handled, and always verify the signature against the raw body.

[CTA: code link below]
All the code is linked below. It's plain Node with no dependencies, so you can run every one of these bugs yourself and see them happen.

[CTA: freelance]
And if you need integrations or automations like this built, I do freelance work, the link's down there too.
