# How YouTube knows what to recommend: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: a lesson with no screen recordings or demo. Everything on screen is custom animation, real thumbnails
(public/thumbnails/youtube) and the real YouTube logo (public/logos/youtube.svg).

Sources:

- Covington, Adams, Sargin, "Deep Neural Networks for YouTube Recommendations", RecSys 2016: the funnel, embeddings, example age, ranking features, weighted logistic regression.
- Zhao et al., "Recommending What Video to Watch Next", RecSys 2019: predicting several behaviours, position bias.
- YouTube blog, "On YouTube's recommendation system" (Cristos Goodrow, 2021): the 2008/2011/2012 history, the 20% drop, 80 billion signals, surveys and valued watchtime.
- He et al., "PLUM", arXiv 2510.07784, 2025: Semantic IDs and generative retrieval (abstract only so far; read the full paper before recording).

Numbers marked "say" are made-up examples to explain the maths, and must be labelled "example" on screen.

---

[YouTube logo at centre. It moves to the top left as a home feed builds around it, one real thumbnail at a time: Veritasium skyscraper, Kurzgesagt immune system, MKBHD iPhone 13 Pro, MrBeast Squid Game, then the other four]

You know when you open YouTube and the home page is somehow full of videos you actually want to watch? You might get a Veritasium video about a skyscraper, then a Kurzgesagt video about your immune system, then an MKBHD review and a MrBeast video, and you never searched for any of them. I make YouTube videos, so I wanted to know how it picks them, and it turns out YouTube's engineers have published a lot about this.

[Feed zooms out into an enormous wall of tiles; the eight real thumbnails become specks. Label: "millions of videos in the model's vocabulary"]
So here's the problem they're solving. There's a huge number of videos to choose from, and the page has to load in a moment. And the first thing you'd need to decide is what a good recommendation even means.

[Timeline, 2008: one "Trending" list, and every viewer's feed shows the same list]
When recommendations started in 2008, YouTube ranked videos by popularity and made one big Trending page, so everyone saw the same thing. That gives you no personalisation at all.

[Timeline, 2011: a thumbnail gets a click, a counter ticks up, and the video's progress bar stops almost immediately. Bar turns red]
So the next obvious signal is clicks, but in 2011 they found that clicking on a video doesn't mean you actually watched it. If you rank by clicks, you end up promoting whichever thumbnail makes people click, even when they leave a few seconds later, and that's how you get clickbait.

[Timeline, 2012: the signal becomes minutes watched. Stat: "20% drop in views"]
So in 2012 they added watch time, and YouTube says views dropped by 20% straight away. They kept it anyway, because time spent watching told them much more about whether people liked a video.

[Funnel, three stages. "millions" flows into "candidate generation", "hundreds" flows into "ranking", "dozens" comes out as a home feed. Real thumbnails pass through]
Now, how do you actually pick from millions of videos? In their 2016 paper they split the job into two steps, because running a big model over every video for every person would be far too slow. The first step is a fast model that narrows millions of videos down to a few hundred that might suit you. The second step is a more careful model that scores those few hundred, and the top dozen or so land on your screen.

[Zoom into the first stage. Thumbnails scattered at random over a dark 2D map. Note on screen: "simplified to 2D; the paper's vectors have 256 numbers"]
That first step relies on an idea called an embedding. Every video gets a list of numbers, 256 of them in the paper's experiments, and you can think of those numbers as a position in space. At first the positions are random.

[Viewers appear as dots. One dot draws lines between the videos it watched, and those thumbnails drift towards each other. Clusters form: science, tech, entertainment]
During training, the model looks at what people actually watched and tries to predict the next video from the earlier ones, and it nudges the numbers whenever it gets that wrong. So videos that tend to be watched by the same people slowly end up near each other. What's interesting is that this stage works from video IDs, so nobody had to tell it that Veritasium and Kurzgesagt are both science channels. They end up close together because the same people watch both.

[Your last 50 watches shown as columns of numbers. They collapse into one averaged column, joined by an averaged search column and small location and device tiles. Together they pass through three narrowing layers, 1024, 512, 256, and come out as one vector labelled "you"]
Then you need a position for yourself as well. The model takes your recent watches, up to 50 of them in the paper's experiments, and averages their vectors into one. It does the same with your recent searches, adds things like your region and device, and passes it all through a neural network. What comes out is one vector with the same 256 numbers, so you now sit on the same map as the videos.

[A glowing "you" dot lands on the map. A circle grows around it and the nearby thumbnails light up blue. Timer: "tens of milliseconds"]
And now the search is easy, because finding videos for you means finding the videos closest to you on the map. Nearest neighbour search can do that within the time limit they had, which was tens of milliseconds, and that gives you your few hundred candidates.

[A fresh thumbnail, "uploaded today", sits at the edge of the map. A line chart shows a video's real popularity spiking just after upload, while a flat line shows the model's old prediction. A tile labelled "example age" is added, and the prediction line rises to meet the spike]
There's one problem with this, which is that the model learns from past weeks, so it would predict how popular a video was on average over those weeks and miss a video that's taking off today. So they give the model the age of each training example as an input, and when they serve recommendations they set that age to zero, which means the model is predicting what people want to watch right now. In their tests, that made a big difference to watch time on newly uploaded videos.

[Zoom into the second stage. A candidate thumbnail on a light card, with feature rows filling in beside it: "videos watched from this channel: 12", "last watched this topic: 2 days ago", "times shown to you already: 3". Label: "example"]
So now we have a few hundred videos and we can afford to look at each one closely. The ranking model uses hundreds of features, and the paper says the most important ones describe your history with that video and similar ones, like how many videos you've watched from this channel and when you last watched this topic. It also knows how many times it has already shown you the video, so if it recommended something and you didn't watch it, that video gets pushed down the next time the page loads. That's why a thumbnail you keep ignoring eventually goes away.

[Ten impressions in a row; one is clicked with a bar showing its minutes watched, nine are unclicked with a weight of 1. Example with 100 impressions: 10 clicked, 60 minutes total. Equation builds: 60 / 90 = 0.67, next to the true average 60 / 100 = 0.6]
What it's predicting is expected watch time, and they do that with a neat trick. They train an ordinary click predictor, except each clicked video counts as many times as the amount of time it was watched, and each video that wasn't clicked counts once. So say we show 100 videos, 10 get clicked, and those add up to 60 minutes of watching. The model's odds come out as 60 divided by the 90 unclicked videos, so about 0.67, and the real average watch time per video shown is 0.6 minutes. Because most impressions don't get clicked, those two numbers stay close, so the odds work as an estimate of watch time. When they tried weighting every example equally, the loss in their watch time test got worse by 4.1%.

[Star rating popup slides in over a watch page: five stars. 1 and 2 turn red, 3 stays grey, 4 and 5 turn green. Label: "valued watchtime"]
But watch time has its own problem, because you can watch something for an hour and regret it. So YouTube also sends out surveys that ask you to rate a video from one to five stars, and only time on videos rated four or five counts as what they call valued watchtime. Most people never answer a survey, so they train a model to predict what your answer would have been.

[One candidate splits into several predictions on dials: click, watch time, like, dismiss, survey rating. Dials feed into a weighted equation that produces one score. The list reorders as the weights change]
Their 2019 paper shows where this leads. The ranking model predicts several things at once, like whether you'll click, how long you'll watch, whether you'll like it and whether you'll dismiss it. Those predictions are then multiplied together using weights into one final score, and the interesting part is that people tune those weights by hand. So at the end of all this machine learning, there's still a team deciding how much a like is worth compared to a minute watched.

[Bar chart: click rate by position 1 to 9, with position 1 towering above the rest (from Figure 6 in the paper, relative scale). A "shallow tower" splits off from the main model and takes only position and device. Its output joins the main score during training, then fades out for serving]
That paper also deals with a problem the system causes for itself. Videos at the top of the list get clicked more, partly because they're better matches and partly just because they're at the top, and then the model trains on those clicks and learns to like whatever it already ranked highly. To separate those two effects they train a small second model that only sees the position and things like your device, so it soaks up the part of the click that's due to position. When they serve recommendations they leave position out, and the main model's score is what counts.

[Video IDs dissolve into short token sequences. A language model writes tokens one at a time, like an LLM writing words, and the tokens resolve into a thumbnail]
These papers are a few years old, and YouTube doesn't publish its current weights, so we can't say exactly what runs today. But in 2025 a team including YouTube's Cristos Goodrow published a paper on where this is heading. They give each video a short sequence of tokens called a Semantic ID, and then they adapt a language model to generate the tokens of the video you'd want next, the same way an LLM generates words.

[Full funnel again, with the real thumbnails flowing through and each stage lighting up as it's named, ending on the home feed from the opening]
So that's the whole process. Videos get positions on a map based on who watches them, you get a position based on what you've watched and searched, and the videos closest to you become a few hundred candidates. Then a bigger model predicts what you'd do with each one, those predictions get combined into a score using weights that people chose, and the top results are your home page. If you liked this one, I also made a video on how search APIs work, which you'll find linked here.
