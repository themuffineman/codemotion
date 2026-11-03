# Trading with an LLM: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: what we're building and the idea behind the bets, then the setup on Capital.com and OpenRouter with real
screenshots, then the code file by file, then the live run and the backtest results, then how to swap the strategy.
Screenshot file names are in projects/llm-trading/PLAN.md, section 3. Numbers marked [fill in] come from the backtest
and the live run.

---

## 1. Intro

[Title: "Letting an LLM trade"; a chart line moving, with BUY and SELL pills popping onto it]
In this video we're going to build a trading bot where an LLM makes every single decision. Every time the bot
places a trade, it asks the model whether it should buy or sell, and then it does whatever the model says.

[Pill: "Demo account · virtual money · no alpha"]
I want to be upfront that this strategy isn't going to make anyone rich, and it isn't meant to. It's a fun
experiment, and the real goal is to show you how the whole thing fits together, so you've got the broker, the
API keys, the market data, the LLM call and the order all wired up. Once you have that, you can swap in any
strategy you want.

## 2. The idea: bets

[One trade on a chart: entry line in the middle, green take profit line above, red stop loss line below, both
the same distance away; label "1 : 1"]
So the whole thing is based on bets. A bet is one trade where the take profit and the stop loss are the same
distance from where we enter, so that's a one to one risk to reward. If we're risking ten pips, we're also
aiming for ten pips.

[Price wiggles between the two lines for a while before it touches one]
A bet can go on for a while, because the price can bounce around between those two lines for as long as it
wants. The bet only ends when the price actually touches one of them.

[Two outcomes side by side: price touches the top line → "BUY was right"; price touches the bottom → "SELL was right"]
And because both lines are the same distance away, every bet has one right answer. If the price reached the
top line first, then buying was the right call, and if it reached the bottom line first, then selling was the
right call.

## 3. T minus 2, T minus 1, T0

[Timeline of three bets in a row on the chart, labelled T-2, T-1, T0]
So let's walk through it. Say at T minus 2 we placed a buy, and the price went up and hit our take profit. That
was a good trade, so we write it down as a buy.

[T-1 starts exactly where T-2 ended; arrow from T-2's end to T-1's start]
T minus 1 starts at exactly the moment T minus 2 ended. Say we buy again, but this time the price drops and
hits the stop loss. That trade lost, which means the right move would have been the opposite one, so we write
T minus 1 down as a sell.

[T0 starts where T-1 ended, with a big "?" on it]
And then T0 starts where T minus 1 ended, and that's the one we have to decide right now.

[The labels pull off the chart into a row: BUY BUY SELL SELL BUY BUY SELL SELL ... ?]
If you keep doing this going back in time, you end up with a sequence of what the right answer was for every
bet, so something like buy, buy, sell, sell, buy, buy, sell, sell. We give that sequence to the model and ask it
what the next one should be. And it can only answer buy or sell, because I want to keep the decision as simple
as possible.

## 4. What we're using

[Three cards: Capital.com (broker + market data) · OpenRouter (the LLM) · Node + TypeScript (our code)]
To build this we need three things. We need a broker that gives us price data and lets us place trades through
an API, and for that I'm using Capital.com. We need an LLM, and for that I'm using OpenRouter, because one key
lets you use pretty much any model. And then the code that ties it together, which is just TypeScript running
in Node.

[Capital.com card zooms in; "EUR/USD · demo account"]
I'm trading the euro against the dollar, and I'm using a demo account, so all of this is virtual money. Forex
works nicely here because selling is just as easy as buying, and the market is open all week.

## 5. Setting up Capital.com

[Screenshot: cap-01-signup.png]
So first, go to Capital.com and sign up. You don't need to put any money in for this.

[Screenshot: cap-02-demo-account.png, highlight the demo switch and the balance]
Once you're in, switch over to the demo account, and you'll see your virtual balance.

[Screenshot: cap-03-2fa.png]
Before they let you make an API key, you have to turn on two factor authentication, so go to settings, then
security, and switch that on.

[Screenshot: cap-04-api-key.png, key blurred, highlight the generate button and the password field]
Then go to API integrations and generate a new key. You give it a name and a password of its own, and it asks for
your two factor code. The key only shows up once, so copy it straight away, because together with that password
it's basically the login to your account.

[.env file in a code window: CAPITAL_EMAIL, CAPITAL_API_KEY, CAPITAL_API_PASSWORD, OPENROUTER_API_KEY, values blurred]
Your email, the key and the key's password all go into a file called .env in our project, so they never end up in
the code itself.

## 6. The Capital.com API

[Screenshot: cap-06-docs-home.png, highlight demo-api-capital.backend-capital.com]
The docs are on open-api.capital.com. The one thing to notice here is that the demo account has its own URL, and
that's the one we'll send everything to.

[Screenshot: cap-07-docs-session.png, highlight X-CAP-API-KEY, CST and X-SECURITY-TOKEN]
Before anything else we have to log in. We send the key in a header, and the email and the key's password in the
body, and the response gives us back two tokens. Those go on every request after that. The session ends after
ten minutes of doing nothing, but our bot checks in every few seconds, so that never happens.

[Screenshot: cap-08-docs-prices.png, highlight resolution=MINUTE and max]
Then the prices endpoint gives us candles, so that's the price history. You tell it which market you want and
what size the candles are, and I'm using one minute candles. It gives you up to a thousand at a time.

[Screenshot: cap-09-docs-positions.png, highlight direction, stopDistance and profitDistance]
This one opens a position. You say which market, whether it's a buy or a sell, and how big. And the nice part is
that you can give it the stop loss and the take profit as distances, so the broker measures both of them from
the price you actually got.

[Screenshot: cap-10-docs-confirms.png, highlight level and dealId]
Opening a position gives you a reference, and you use this endpoint to check it went through. It tells you the
price you got and the ID of the position.

[Screenshot: cap-05-eurusd.png]
And in their API the euro against the dollar is just called EURUSD.

## 7. Setting up OpenRouter

[Screenshot: or-01-keys.png, key blurred]
Now for the model. On OpenRouter, go to Keys and create a new key, and that goes into the .env file too.

[Screenshot: or-02-credits.png]
You'll need a few dollars of credit. The whole of this video cost me [fill in] cents in model calls, so you
really don't need much.

[Screenshot: or-03-models.png, highlight the structured outputs filter]
On the models page you can pick whichever model you want. The only thing it needs is support for structured
outputs, and you can filter for that here.

[Screenshot: or-04-docs-structured.png, highlight the json_schema block]
Structured outputs is how we make sure the model answers with buy or sell and nothing else. We give it a little
schema that says the answer has to be one of those two words, and the model isn't allowed to reply with anything
that doesn't fit.

## 8. The code: config

[Code window: src/config.ts]
So let's look at the code. Everything you'd want to change lives in this config file. There's the pair we're
trading, the distance for the take profit and the stop loss, which is ten pips, how big each trade is, how many
past bets the model gets to see, and which model we're using.

[Highlight the model line]
If you want to try a different model, this is the only line you change.

## 9. The code: logging in and getting candles

[Code window: src/broker.ts, the top part and login]
At the top of the broker file we have the demo URL. Then login sends our key and password, and keeps the two
tokens from the response so every other request can use them.

[Code window: getCandles; highlight the for loop]
getCandles gets the last three days of one minute candles. The API only gives a thousand at a time, so we ask
in chunks of a thousand minutes and add them all to one list.

[Highlight the mid helper]
Each candle has a buy price and a sell price, so we take the middle of the two, and we turn every candle into a
small object with the time, the open, the high, the low and the close.

## 10. The code: labelling the past bets

[Code window: src/labels.ts; next to it a small chart that steps along with the loop]
This is the part that turns candles into our buy and sell sequence. We start at a candle and use its close as the
entry, and we work out where the top line and the bottom line would be.

[Highlight the inner loop; the chart cursor moves candle by candle]
Then we walk forward one candle at a time. If a candle's high reaches the top line, that bet was a buy. If its
low reaches the bottom line, it was a sell.

[Highlight the hitUp && hitDown line; one tall candle crosses both lines]
Sometimes one candle is big enough to touch both lines, and then we can't tell which one it hit first, so we just
skip that bet. It doesn't happen often.

[Highlight i = j; a new bet starts where the last one ended]
And then the next bet starts at the candle where this one ended, which is the T minus 2, T minus 1 idea from
before. At the end we've got a list of buys and sells.

## 11. The code: asking the model

[Code window: src/llm.ts]
Here's the call to the model. It's a normal chat completion request to OpenRouter.

[Highlight the system message]
In the system message we tell it what's going on. We're trading the euro against the dollar, every bet has the
take profit and the stop loss the same distance away, and buy means the price went up first and sell means it
went down first.

[Highlight the user message; show what it looks like: "BUY BUY SELL SELL BUY ..."]
The user message is just the sequence, oldest first, with spaces in between.

[Highlight response_format and the enum]
And this is the structured output part. The answer has to be an object with one field called decision, and that
field can only be buy or sell. So when we read the reply, we know it's one of those two.

## 12. The code: placing the bet

[Code window: src/broker.ts, openBet]
Now openBet. We open the position with the direction the model gave us, and we pass the same distance for the
stop loss and the take profit, which is what makes it one to one.

[Highlight stopDistance and profitDistance; the chart shows the lines being drawn from the entry]
Because they're distances, the broker puts the take profit above and the stop loss below for a buy, and the other
way round for a sell, all measured from the real entry price.

[Highlight the confirms call]
Then we check the confirmation to get the price we got and the ID of the position.

[Code window: waitForClose]
waitForClose checks on the position every five seconds. Once it's gone, we look at the account history to see
whether the take profit or the stop loss closed it, so we know if the bet won.

## 13. The code: the loop

[Code window: src/bot.ts]
And this is where it all comes together. When the bot starts, it logs in, gets the candles, labels them, and
keeps the last thirty bets.

[Highlight the while loop line by line as the voice goes]
Then it loops forever. It asks the model for a decision, places the bet, and waits for it to close. If the trade
made money, the model was right, so we add its answer to the history. If it lost, the right answer was the other
one, so we add that instead. Then the oldest bet drops off the front, and we ask again.

[Highlight appendFileSync]
Every bet also gets saved to a file, so we can look at the results later.

## 14. Running it

[Terminal: npx tsx src/bot.ts; lines appear: "SELL @ 1.08412  (TP and SL 0.001 away)", then "WIN"]
So let's run it. The bot asks the model, the model says [fill in], and the trade goes in with its take profit
and stop loss.

[Split screen: terminal on one side, cap-11-live-trade recording on the other, with the TP/SL lines on the chart]
And you can see it on Capital.com too, with both lines on the chart. Now we just wait for the price to hit one of
them.

[Speed-up of the terminal, bets scrolling past; a running counter of wins and losses]
I left it running for [fill in] hours, and it placed [fill in] bets.

## 15. The results

[Bar chart: model win rate vs coin flip vs "repeat the last one", from backtest.ts]
I also ran a backtest on the past few days, where I asked the model about bets that had already happened and
checked its answers. I compared it against flipping a coin, and against just repeating whatever the last bet was.
[fill in once we have the numbers, e.g.: The model got [x] percent right, the coin got [y], and repeating the last
one got [z].]

[Pill: "Spread"; a tiny gap between the buy and sell price on the chart]
Also keep in mind that every trade starts slightly behind because of the spread, which is the small difference
between the buy price and the sell price. So even something that's right half the time slowly loses money, and
that's why the coin flip is the thing to beat.

## 16. Making it yours

[bot.ts with labels.ts and llm.ts highlighted as the parts you swap; broker.ts dimmed]
So this is the part I actually care about. The broker code and the loop don't really change. If you want a
different strategy, you change what goes into the model and what you ask it. You could give it the actual
candles, or some indicators, or the news, and you'd only be touching these two files.

[config.ts with the model line highlighted]
And if you want to try a different model, you change one line in the config.

## 17. Outro

[GitHub link card for the project; CTA "Tell me in the comments"]
The code is linked in the description. If you try your own strategy with it, let me know in the comments what
you gave the model and how it did.
