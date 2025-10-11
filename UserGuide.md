## feature: view and vote total count

The Category Statistics feature displays total view counts and upvote counts for each category on your NodeBB forum's categories page. This helps users quickly understand which categories are most active and engaging.

## What You'll See

When you visit the categories page, each category now displays four key metrics:


## How to Use

1. Navigate to your forum's categories page (usually at `/categories`)
2. Look for the statistics grid displayed for each category
3. The metrics appear below the category name and description

![alt text](image-1.png)

## automated tests
![alt text](image.png)
For automated test, the library.js file is configured so that when you run ./nodebb log and open catogories, this gets automatically printed.

## feature: downvote visibility

The **Downvote Visibility** feature allows users to see the list of users who have upvoted or downvoted their posts. This promotes transparency and helps users understand who supports or disagrees with their content.

## What You'll See

When viewing one of your posts, you can now see lists of users who:

* Upvoted your post
* Downvoted your post

These appear below the post’s vote icons, depending on the forum’s configuration settings.


## How to Use

1. Go to your forum and open any post you’ve made.
2. Click the vote icons under your post to view the list of upvoters and downvoters.
3. (For admins) Navigate to **Admin Panel → Settings → Reputation → Downvote Visibility** to adjust who can view this information.

   * Options include **Disabled**, **Privileged Users Only**, and **Logged-in Users**.
   * The default has been updated to **Logged-in Users**.


## Automated Tests

There were **no new automated tests** added for this feature because downvote visibility is an existing built-in NodeBB functionality.
NodeBB’s core test suite already includes tests verifying the `postsAPI.getVoters()` endpoint, which ensures both upvoters and downvoters are returned correctly. These existing tests are sufficient to confirm that enabling visibility through configuration behaves as intended.

## feature: Custom Search
This plugin adds a fallback search endpoint (GET /api/custom-search) that returns matching posts and a small plain-text snippet around the match. The client renders results using the normal topics list and injects/highlights the snippet in the topic teaser when available.

## Test manually
Start NodeBB (if not already running):
```bash
./nodebb start
```
Use the forum UI:
Open a category page that shows the search box.
Type a search term with at least 3 characters (the client auto-runs searches at >= 3 chars).
Observe:
Results render using the normal topics list look.
When a match occurs in post content (not title), the topic teaser displays a short snippet containing the matching words, with matches highlighted.
Quick API check (curl)
Verify the endpoint returns JSON and snippet fields:
```bash
curl -s 'http://localhost:4567/api/custom-search?term=test&asAdmin=1' | jq .
```
Expected keys:
results: array of post summary objects (each contains pid, topic, user, etc.)
Each result may include snippet (string) — server-generated plain text snippet around the match
matchCount: number of matches returned
searchedFor: original search term

## Automated tests
Unit tests:
Path: helpers.test.js
Helper module: helpers.js
Integration / smoke tests:
Path: api.test.js
Note: these check the runtime API contract and will skip if http://localhost:4567 is not reachable.

## What the tests do
### Unit tests (helpers.test.js)
stripHtml(html):
Ensures HTML is converted to plain text correctly (important because snippets are generated from post HTML).
buildSnippet(rawText, tokensArr, left, right):
Validates snippet extraction around the first matching token.
Confirms truncation/ellipsis behavior when content is long.
Confirms returns null when no token is found.
findMatchingPidsFromPosts(postsFields, searchTerm):
Ensures matching pids are detected correctly from post fields.
Why this matters: these are the deterministic core functions used by the fallback search to find matches and produce safe plain-text snippets. Unit tests are fast and reliable for CI.

### Integration tests (api.test.js)
GET /api/custom-search without term returns 400.
GET /api/custom-search?term=...&asAdmin=1 returns 200 and includes a results array; each result contains a snippet property (may be null).
GET /api/custom-search/info returns sampling metadata (e.g., totalTopics, sampleTitles).
Why this matters: these smoke tests validate the runtime API contract and confirm the plugin endpoints behave as expected in a running NodeBB instance. They are intentionally conservative and will skip if the server isn't available.
Why the combined test set is sufficient for this change
The main behavioral surface changed is backend search/fallback logic and snippet generation. The unit tests cover snippet generation and matching logic in a deterministic way. The integration tests confirm the runtime API and contract behave as expected. Together they provide good coverage of the backend changes without requiring full browser automation for front-end rendering. (Front-end injection/highlighting is best covered separately by jsdom unit tests or E2E tests if needed later.)

How to run the tests locally
Unit tests only (fast; no server required):
```bash
npx mocha "nodebb-plugin-custom-search/test/helpers.test.js" --exit
```
Integration tests (NodeBB must be running at http://localhost:4567):
```bash
./nodebb start
npx mocha "nodebb-plugin-custom-search/test/api.test.js" --exit
```
Run both plugin tests:
```
npx mocha "nodebb-plugin-custom-search/test/*.js" --exit
```
