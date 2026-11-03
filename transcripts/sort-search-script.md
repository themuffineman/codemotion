# Bubble sort and binary search: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Audience: beginners learning their first sorting and searching algorithms.
Length: about 2 minutes.
Demo: codemotion/projects/sort-search (bubble-sort.ts, binary-search.ts, run.ts, bench.ts).
run-demo.sh reruns everything and saves the real output to public/code/sort-search/terminal/.
The example list: [7, 2, 9, 4, 1, 8, 5, 3]. Sorted: [1, 2, 3, 4, 5, 7, 8, 9]. Search for 8: index 3, then 5, then 6.

---

## 1. Intro

[A row of 8 shuffled number tiles]
Okay, so in this video I want to show you two algorithms that usually get taught together, bubble sort and binary search. Bubble sort is a way to put a list of numbers in order, and binary search is a way to find a number in a list once it's in order. I'll go through both with a small example, show you the code, and then we'll see how fast they actually are.

## 2. Bubble sort

[Tiles 7 and 2 highlighted, they swap; then 7 and 9, no swap; then 9 and 4, swap; and on to the end]
Let's start with bubble sort. Here's the list we're going to sort: 7, 2, 9, 4, 1, 8, 5, 3. The way bubble sort works is you go through the list from left to right, and you compare each number with the one next to it. If the left one is bigger, you swap them, and then you move on to the next pair. So 7 and 2, the 7 is bigger, so they swap. Then 7 and 9 are already in the right order, so we leave them. Then 9 and 4 swap, and you keep going like that until you reach the end of the list.

[9 slides all the way to the right end and turns green]
If you watch the 9 during that first pass, it was bigger than everything it got compared with, so it kept getting swapped one step to the right until it ended up at the very end. That always happens: after the first pass, the biggest number is at the end of the list, which is exactly where it belongs. It sort of floats up to the top like a bubble, and that's where the name comes from.

[Passes 2 to 5 play fast; one more tile turns green on the right after each pass]
Then you go through the list again, and this time the second biggest number ends up in second to last place. You keep doing passes like this until everything is in order. And because the end of the list is filling up with numbers that are already in the right place, each pass can stop a little earlier than the one before it.

[Pass 6: comparisons sweep across with no swaps]
One more thing. If you go through a whole pass and you didn't have to swap anything, the list is already sorted, so you can just stop there. In our example, that happens on the sixth pass.

## 3. The bubble sort code

[bubble-sort.ts, focus the outer loop with `end`, then the inner loop and the swap, then `if (!swapped) break`]
Here's what that looks like in code. The outer loop keeps track of where the unsorted part of the list ends, and it moves one step to the left after every pass. The inner loop goes through the unsorted part, compares each number with the next one, and swaps them if they're in the wrong order. We also keep a swapped flag, so if a pass finishes without any swaps, we break out of the loop early.

## 4. Binary search

[The sorted row; low and high markers at both ends; looking for 8]
Now that the list is sorted, let's say we want to check whether 8 is in it. The simple way would be to start at the beginning and check every number until you find it. But because the list is sorted, we can do a lot better than that. We keep track of two positions, low and high, which mark the part of the list where the 8 could still be. At the start, that's the whole list.

[Middle at index 3, value 4; the left half dims out]
We look at the number in the middle, which is 4. Since 8 is bigger than 4, and the list is sorted, we know the 8 has to be somewhere to the right of it. So we can ignore the whole left half and only search the right half.

[Middle at index 5, value 7; dims again; middle at index 6, value 8, turns green]
The middle of the right half is 7. 8 is still bigger, so again we ignore everything on the left and keep the right side. And the next number we look at is the 8, so we've found it. That only took three checks, where going one by one would have taken seven.

[binary-search.ts, focus low and high, then mid, then the three branches]
The code follows the same steps. We start with low at the first index and high at the last one. While there's still something between them, we work out the middle index and look at the number there. If it's the number we're looking for, we return its position. If it's smaller than what we want, we move low to just after the middle, and if it's bigger, we move high to just before the middle. And if low and high cross each other, the number isn't in the list, so we return minus one.

[Terminal: 01-run.txt, the passes, then the three "look at" lines]
When I run this on our example, you can see the list after each pass of bubble sort, and then the three numbers binary search looked at before it found the 8.

## 5. How fast are they

[A counter: 10,000,000 halving down to 1 in about 24 steps]
The reason binary search is so useful is that every check cuts the list in half. So even with ten million numbers, you'd need at most about twenty four checks to find any number in it.

[Terminal: 02-bench.txt search lines; bars: one by one 10.2 s vs binary search 2.2 ms]
To show you the difference, I ran a thousand searches on a sorted list of ten million numbers. Checking one by one took about ten seconds, and binary search took about two milliseconds.

[Terminal: 02-bench.txt sort lines; bars: bubble sort 7.6 s vs built-in sort 10 ms]
Bubble sort is the slow one of the two. Because it keeps comparing neighbours pass after pass, the amount of work grows really quickly as the list gets bigger. Sorting twenty thousand numbers with it took about seven and a half seconds, while the sort that's built into JavaScript did the same list in about ten milliseconds.

## 6. Wrap-up

[Two cards: "Bubble sort: swap neighbours until nothing moves" / "Binary search: check the middle, keep the half that can hold it"]
So to sum up, bubble sort goes through the list over and over, swapping neighbours that are in the wrong order, until a pass goes by with no swaps. It's a good way to learn how sorting works, but in real code you'd normally use the sort that comes with your language. Binary search keeps checking the middle of the list and ignoring the half that can't contain the number, which makes it really fast, as long as the list is sorted first.
