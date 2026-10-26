#!/bin/bash
# Runs every command shown in the video in a fresh repo and saves each one's real output
# to public/code/git-internals/terminal/<step>.txt. Fixed author and dates keep the hashes stable.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/../../public/code/git-internals/terminal"
DEMO=/c/tmp/git-demo
mkdir -p "$OUT"; mkdir -p "$DEMO"; rm -rf "$DEMO"/* "$DEMO"/.git; cp "$HERE"/read-object.js "$HERE"/hash-object.js "$HERE"/package.json "$DEMO"
cd "$DEMO"
export GIT_AUTHOR_NAME="You" GIT_AUTHOR_EMAIL="you@example.com" GIT_COMMITTER_NAME="You" GIT_COMMITTER_EMAIL="you@example.com"
export GIT_AUTHOR_DATE="2026-10-26T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-26T10:00:00+00:00"

# run <step> <command...>: prints "$ command" and its output into <step>.txt (appends)
run() { local step=$1; shift; { echo "\$ $*"; eval "$*"; echo; } >> "$OUT/$step.txt" 2>&1; }
rm -f "$OUT"/*.txt

run 01-init "git init -b main"
git config core.autocrlf false
run 01-init "ls .git"
run 01-init "find .git/objects -type f"

printf '# My app\n' > README.md
printf "console.log('hi')\n" > app.js
run 02-add "git add README.md app.js"
run 02-add "find .git/objects -type f"

README=$(git hash-object README.md)
run 03-read "node read-object.js $README"
run 04-hash "node hash-object.js README.md"
run 04-hash "git hash-object README.md"

run 05-commit "git commit -m \"first commit\""
run 05-commit "find .git/objects -type f"
run 06-cat "git cat-file -p HEAD"
run 06-cat "git cat-file -p HEAD^{tree}"

printf "console.log('hello')\n" > app.js
run 07-second "git commit -am \"say hello\""
run 07-second "find .git/objects -type f | wc -l"
run 07-second "git cat-file -p HEAD"
run 07-second "git cat-file -p HEAD^{tree}"

run 08-refs "cat .git/HEAD"
run 08-refs "cat .git/refs/heads/main"
run 08-refs "git branch feature"
run 08-refs "cat .git/refs/heads/feature"

run 09-amend "git log --oneline"
export GIT_COMMITTER_DATE="2026-10-26T10:05:00+00:00"
run 09-amend "git commit --amend -m \"say hello!\""
run 09-amend "git log --oneline"
