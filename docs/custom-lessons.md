# Custom lesson packs

My Lessons is a browser-local content library. No account, backend, chatbot
integration, API key, or server-side database is needed.

## User flow

1. Open **My lessons** and generate a prompt with a level, focus, topic, and
   optional Romanized Nepalish notes.
2. Use the prompt with a chatbot of your choice.
3. Paste its complete response or choose a JSON file.
4. Review the editable preview, then save.
5. Study individual lessons or play the pack using one of the three existing maps.

Invalid imports list the affected lesson, question, and field. Copy repair
prompt explains the required corrections without sending anything to a chatbot.
The example packet can be loaded directly in the importer.

## Version 1 packet

The complete, importable example is [workplace-pack.json](examples/workplace-pack.json).
Its root has:

- `format`: `quest-lesson-pack`.
- `version`: the number `1`.
- `title`: nonempty text, at most 80 characters.
- `description`: optional text, at most 600 characters.
- `level`: `N5`, `N4`, `N3`, `N2`, `N1`, or `Mixed`.
- `lessons`: exactly three lessons with distinct titles.

Each lesson contains `kind` (kanji or grammar), `title`, `kana`, `romaji`,
`meaning`, `hook.en`, `explanation`, one to three `examples`, and three
`questions`. Optional `hook.ne` contains Romanized Nepalish.

Each example contains `japanese`, `romaji`, and `english`.

Each question contains `prompt`, three distinct `choices` with `text` and an
optional `note`, `answer`, and `why`. The correct answer is a **zero-based
integer**: 0 means the first choice, 1 the second, and 2 the third. Optional
fields are `context`, `romaji`, and `support`, with English `en` and optional
Nepalish `ne`. English is the fallback when Nepalish is not supplied.

Pasted JSON can be wrapped in a single JSON code fence. Commentary surrounding
the JSON is rejected. Individual packets are limited to 1 MB; uploaded library
backups are limited to 25 MB. Text fields also have bounded lengths. Unsupported
versions, invalid answer indices, duplicate choices, and missing fields are
rejected before saving. Unknown fields, including supplied IDs and scripts, are
not retained. Imported strings are escaped or assigned with textContent; they
are never evaluated as markup or code.

The preview edits all supplied content, including example translations, all
question choices, the correct answer, and explanations. Format checks do not
prove that generated Japanese or an answer key is linguistically correct.

## Storage and practice

IndexedDB stores up to 50 pack records, including removed packs. Normal play
uses `quest-kotoba-trail-packs.v1`; `?qa=1` uses the separate
`quest-kotoba-trail-packs.qa.v1` database. Existing settings and campaign saves
keep their original localStorage namespace.

The game creates pack IDs. Runtime lesson and question IDs include the pack ID,
revision, and lesson/question position. Two packs reviewing the same kanji do
not share attempts or discoveries with each other or with the built-in lessons.

Editing changed content starts a new revision with fresh practice. Previous
revision history is retained in library backups. Saving unchanged content keeps
the current revision. Exact duplicate imports are rejected. Removed packs stay
stored and can be restored; the first release does not permanently purge them.

Database writes are serialized and considered saved only when the IndexedDB
transaction completes. A failed write is reported, and in-memory practice can
still be included in a backup. If IndexedDB cannot open, prompt generation,
validation, editing, and packet export remain available; saving is disabled.

Custom runs copy a built-in map, remap its shrines and bridge gates to the pack,
and use separate practice records. Original map geometry and lesson data remain
unchanged. Runs are replayable; saved practice survives reloads, while the
platformer's current position and opened bridges reset when starting a new run.

## Sharing and backup

**Export lessons** downloads only the versioned lesson packet, without pack
identity or player attempts. **Back up my library** downloads a
`quest-library-backup` version 1 object containing pack records and histories.

Restore a backup through the same importer. It validates the records, previews
their titles, and restores missing packs in one database transaction. Existing
pack IDs or matching content are skipped, preserving the current local copy.
Browser storage is tied to the browser and site origin; changing browser,
device, scheme, or domain requires exporting and importing a backup.
