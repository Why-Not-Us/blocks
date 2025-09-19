
# Plan: Add Starred Blocks Tab to User Page

## Overview
Enhance the user page to display a new tab showing blocks that the user has starred, in addition to their own blocks.

## Details on Starred Gists

- **Starred gists** are gists that a user has marked as favorites on GitHub.
- GitHub provides an API endpoint to list gists a user has starred:
  `GET https://api.github.com/users/<username>/starred`
- The app currently caches user gists in `/usercache/<username>.csv`, but does not cache starred gists.
- Starred gists may belong to other users, so metadata and thumbnails should be fetched for each starred gist.

## Implementation Steps (Minimally Commitable)

1. **Backend: Fetch Starred Gists**
   - Implement a function to fetch starred gists for a user using the GitHub API.
   - Cache starred gists in `/usercache/<username>-starred.csv` for performance.
   - For each starred gist, fetch metadata (id, description, owner, public/private) and thumbnail.

2. **Backend: Expose Starred Gists in API**
   - Add or update an endpoint to return starred blocks for a user.
   - Ensure the endpoint returns necessary block metadata for display.

3. **Backend: Unit Test Starred Gists Fetching**
   - Add tests to verify starred gist fetching and caching logic.

4. **Frontend: Add Tab UI**
   - Add a new tab labeled "Starred Blocks" to the user page.
   - Ensure tab navigation between "My Blocks" and "Starred Blocks".

5. **Frontend: Fetch and Display Starred Blocks**
   - Update frontend logic to fetch starred blocks when the tab is selected.
   - Render starred blocks in a similar style to the user's own blocks, showing the gist owner.

6. **Frontend: E2E Test Tab Switching and Data Loading**
   - Test with users who have starred blocks and those who have not.
   - Validate tab switching, data loading, and error handling.

7. **Documentation**
   - Update README or relevant docs to describe the new feature.

## Acceptance Criteria
- User page displays a "Starred Blocks" tab.
- Tab shows blocks the user has starred, with correct metadata and owner info.
- Switching between tabs is smooth and intuitive.
- No regressions to existing user block display.
