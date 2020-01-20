set -e

#DRONE_REPO=DevExpress/DevExtreme
#DRONE_BRANCH=20_1
#DRONE_PULL_REQUEST=11593
#DRONE_COMMIT_SHA=c19746a0b11ce2764dd880c7b3af84c3b0e95d6d

DEPTH=50
PR_HEAD="refs/pull/$DRONE_PULL_REQUEST/head"

echo "PR $DRONE_PULL_REQUEST: $DRONE_REPO#$DRONE_BRANCH ← $DRONE_COMMIT_SHA"
echo ""

git init
git config user.email "devextreme-ci@devexpress.com"
git remote add origin "https://github.com/$DRONE_REPO.git"

git fetch -n --depth=$DEPTH origin "$DRONE_BRANCH:$DRONE_BRANCH"
git fetch -n --depth=$DEPTH origin "$PR_HEAD:$PR_HEAD"

while ! git merge-base "$DRONE_BRANCH" "$PR_HEAD"; do
    echo ""
    echo "Fetching $DEPTH more commits..."

    git fetch -n --deepen=$DEPTH origin "$DRONE_BRANCH"
    git fetch -n --deepen=$DEPTH origin "$PR_HEAD"

    DEPTH=$((DEPTH+DEPTH))

    if [ $DEPTH -gt 1000 ]; then
        echo "No common ancestor found"
        exit 1
    fi
done

git checkout -qf "$DRONE_BRANCH"
git merge --squash "$DRONE_COMMIT_SHA"
