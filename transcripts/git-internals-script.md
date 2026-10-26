# How Git stores your code: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Audience: junior devs who use git add / commit / branch every day but have never looked inside .git.
Demo: codemotion/projects/git-internals (two tiny Node scripts + run-demo.sh, which runs every command
below in a fresh repo). Real output: public/code/git-internals/terminal/. Author and dates are fixed,
so the hashes below are exactly the ones on screen.

---

## 1. Hook

[A commit drawn as a diff (red/green lines) gets crossed out, replaced by a full folder snapshot]
Most people think a commit stores your changes, like a diff of what you added and removed. It doesn't. Every commit is a full snapshot of your whole project, and Git itself is basically a key-value store, where the key is a hash of the content. Once you see how that works, things like branches, rebase and detached HEAD stop being magic. So let's open up the .git folder and actually look at what's in there.

## 2. An empty repo

[Terminal: git init -b main, then ls .git]
I'll start with an empty folder and run git init. That creates a hidden folder called .git, and that folder is the entire repository. Everything Git knows lives in here.

[Terminal: find .git/objects -type f, no output; objects folder highlighted]
The folder we care about is objects. That's the database. Right now it's empty.

## 3. git add already saves your files

[Two files appear: README.md and app.js with their contents]
So I'll make two tiny files. A README with one line, and an app.js with a console.log.

[Terminal: git add, then find .git/objects -type f, two paths appear]
Now I run git add. Not commit, just add. And if I look in objects again, there are two new files. So git add already saved our files into the database, before we've committed anything.

[One path zoomed: cc / 22473b12..., the first two characters split off as the folder name]
Each file is named after a hash. The first two characters become the folder name, and the rest is the file name. Git does that so it doesn't end up with one folder holding millions of files.

## 4. What's inside an object

[read-object.js, whole file]
If you open one of these in a text editor, it's gibberish, because it's compressed with zlib. But that's all it is. So I wrote this little script. It takes a hash, finds the file in objects, decompresses it, and prints it.

[Terminal: 03-read.txt; "blob", "9", "\0" and "# My app" highlighted one after the other]
And here's our README. It starts with the word blob, which is Git's name for file contents. Then nine, which is the size in bytes. Then a null byte, which I'm showing as backslash zero. And then the actual content. That's it.

[The word "README.md" searched for in the object, not found]
And notice what's not in there. The file name. A blob only stores the content. We'll see where the name goes in a minute.

## 5. The hash is the content

[hash-object.js, whole file, focus the Buffer.concat line, then the sha1 line]
So where does that hash come from? It's just SHA-1 of exactly what we saw. The word blob, the size, the null byte, and the content. This script builds that and hashes it.

[Terminal: 04-hash.txt, both hashes appear, then they're underlined as identical]
If I run it on the README, I get cc22473 and so on. And if I ask Git with git hash-object, it's the exact same hash. So we just computed Git's ID for a file without Git.

[Two folders with the same README going into one blob; then one character changes and a new hash appears]
This is called content-addressable storage. The name of every object comes from its content. Two consequences. If the same content shows up twice, in two files or in two commits, it's stored once. And if you change even one byte, you get a completely different hash, so it's a different object.

## 6. The first commit

[Terminal: git commit -m "first commit", then find shows four objects; the two new ones highlighted]
Now let's commit. And in objects, there are two more files. One is the commit, and one is something called a tree.

[Terminal: git cat-file -p HEAD^{tree}]
Git has a command to print any object, cat-file dash p. So let's look at the tree first. It's a list. Each line has the file mode, the type, the hash, and the file name. So that's where the names live. A tree is basically a directory. It maps names to blobs, and if you had sub folders, it would point to other trees.

[Terminal: git cat-file -p HEAD; tree line, author line, message highlighted]
And here's the commit. It's a tiny text file. It points to one tree, which is the snapshot of the whole project. Then who wrote it and when, and the message. That's a commit.

[Diagram: commit → tree → two blobs]
So, the commit points to a tree, and the tree points to the blobs.

## 7. The second commit

[Terminal: edit app.js, git commit -am "say hello", object count 7]
Now I'll change app.js, so it says hello instead of hi, and commit again. We went from four objects to seven. Three new ones.

[Terminal: second git cat-file -p HEAD^{tree}; README hash highlighted, same as before]
A new blob for the new app.js, a new tree, and a new commit. But look at the README in the new tree. Same hash as before. It didn't change, so Git just points at the blob it already has. That's why a full snapshot on every commit doesn't blow up your disk.

[Terminal: git cat-file -p HEAD; the parent line highlighted]
And the new commit has one extra line, parent. That's the hash of the commit before it. So your history is just a chain of commits, each one pointing back to its parent.

[Diagram: commit 2 → parent → commit 1; each with its own tree; both trees point at the same README blob]
And there's no diff stored anywhere. When you run git diff or git log dash p, Git takes two trees and compares them right then. To be fair, Git does compress things further when it packs objects, but that's a storage trick. The model you work with is snapshots.

## 8. Branches are just files

[Terminal: cat .git/HEAD, cat .git/refs/heads/main]
So what's a branch? Let's look. The HEAD file just says ref, refs slash heads slash main. And that main file contains one thing, the hash of our latest commit.

[Terminal: git branch feature, cat .git/refs/heads/feature; both files side by side with the same hash]
If I create a new branch called feature, Git writes one more file, with the same hash in it. That's it. A branch is a 41 byte file with a commit hash in it. That's why making branches in Git is basically free.

[HEAD → main → commit; then HEAD pointing straight at a commit, labelled "detached HEAD"]
And HEAD is how Git knows which branch you're on. When HEAD points straight at a commit instead of a branch, that's what detached HEAD means.

## 9. Why rewriting history changes hashes

[Terminal: git log --oneline, git commit --amend -m "say hello!", git log --oneline; dcc5f27 changes to b41aac5]
Last thing. Here's our log. If I amend the last commit, even just to add an exclamation mark, the hash changes. Because the message is part of the commit's content, so it's a new object. Git didn't edit the old commit. It made a new one and moved the branch to point at it.

[Chain of three commits; the first one changes, and the change ripples: each child's parent line changes, so every hash after it changes]
And it ripples. If you change an old commit, every commit after it has a different parent line, so they all get new hashes too. That's what rebase does, it makes new commits. And it's why you shouldn't rewrite history you've already pushed. Everyone else still has the old hashes.

## 10. Recap

[Four cards appear: blob, tree, commit, branch]
So that's Git. Blobs hold the content of your files. Trees hold the names and point to blobs. Commits point to one tree, which is a full snapshot, and to their parent. And branches are just files with a commit hash in them. Everything else Git does is built on those four things.
