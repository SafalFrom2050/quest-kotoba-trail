# Contributing to Quest: Kotoba Trail

You can help with Japanese wording, lesson examples, gameplay bugs,
accessibility, or documentation. Small fixes are welcome.

## Report a bug or suggest a change

Check the [existing issues](https://github.com/SafalFrom2050/quest-kotoba-trail/issues)
and [open one](https://github.com/SafalFrom2050/quest-kotoba-trail/issues/new) if
needed. For a bug, include the world or lesson, the steps to reproduce it, and
what you expected to happen. If browser or input behavior matters, include
your browser, device, and whether you used keyboard or touch. For a Japanese
correction, quote the in-game text and explain the suggested wording.

## Open a pull request

1. Fork the repository, clone your fork using the
   [local setup instructions](README.md#play-locally), and create a branch.
2. Make the change and run the relevant checks below.
3. Push the branch to your fork and open a pull request against this repo's
   `main` branch. Summarize what changed and how you checked it. Link the
   related issue if there is one.

For code and lesson changes, run the syntax checks and test suite.

```sh
npm run check
npm test
```

Use `npm start` to try the affected route in a browser. For movement or level
changes, check the jumps, landings, and checkpoints your change touches. For
UI changes, try keyboard controls and a narrow viewport. Add `?qa=1` to the
local game URL to keep test runs separate from your regular play data.

## Work on lesson content

Built-in lessons live in [`src/content.mjs`](src/content.mjs). For a new
example or question, include natural Japanese, a reading, a clear English
meaning, and an explanation of the answer. English is the default hint
language. Romanized Nepalish hints are optional.

If you are contributing an example custom pack, use the
[lesson pack format](docs/custom-lessons.md) and check the import through
**My Lessons**.
