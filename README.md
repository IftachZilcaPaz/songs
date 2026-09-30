# השירונית של רונית

A Next.js app that turns free text about a person (or anything else) into original Hebrew songs, in several style variations at once. Songs can then be sung with AI music generation.

- **Lyrics:** Claude writes each variation as a separate request, following [`rules/HEBREW_VOICE_RULES_FOR_BOTS.md`](rules/HEBREW_VOICE_RULES_FOR_BOTS.md).
- **Audio (optional):** ElevenLabs Music renders a short preview (name plus the risky words, per rule 7.6) or the full song.

## How the Hebrew voice rules are applied

The model writes only the **voice** version of each line. The server then applies the mechanical rules deterministically, so they hold even when the model slips:

| Rule | Where |
|---|---|
| Display text has no niqqud: derived by stripping the voice text, so the two never drift apart | `src/lib/hebrew/niqqud.ts` |
| Dagesh only in בּ/כּ/פּ, and never on a ב right after a ו or ב prefix (וּבֵיצִים, בַּבוֹקֶר); shuruk (וּ) kept | `removeDisallowedDagesh` |
| No long dash (— / –) | `prepareVoiceLine` |
| Confirmed lexicon spellings; a prefix keeps the writer's pointing (לָעוֹלָם) | `rules/voice-lexicon.txt`, `src/lib/hebrew/lexicon.ts` |
| A person's name spelled the same way everywhere | name entries in `finalizeSong` |
| Numbers written as digits, Latin words | shown as warnings on the song card |

Stress placement, rhyme on stressed syllables and balanced lines are handled by the model through the rules document, which goes into the system prompt verbatim (and is prompt-cached).

## Pronunciation review before audio

Right after a song is written, a second Claude pass proofreads every voice line for words the singing engine is likely to mispronounce (ambiguous readings, masculine/feminine present-tense forms such as עולֶה/עולָה, final-syllable stress on unfamiliar words). It may change niqqud only: a fix that changes letters is discarded, and the confirmed lexicon and dagesh rule are re-applied. Audio buttons stay disabled until the review finishes, so the paid render always uses the reviewed text.

Each song also gets a fixed `seed`, reused for every render, so re-rendering after fixes stays as close as possible to the previous take.

**Free read-aloud:** when the device has a Hebrew voice, the card offers a browser read-aloud of the voice text (and of each spelling in the fixer). It checks what the niqqud says, not how the singer will sing it.

## Fixing pronunciation by ear

On a song card, **תיקון הגייה** turns every word into a button. Clicking a word that was sung wrongly asks Claude for three or four alternative voice spellings (same letters, different niqqud). Each option can be heard sung in its line, next to the current spelling. The chosen spelling is applied to the line or to the whole song, and can be remembered in **המילון שלי**. That personal dictionary is kept in the browser and sent with every new song, so a word fixed once stays fixed.

When no spelling works, **אף אפשרות לא עובדת** adds the word to the personal avoid list: new songs are written without it, and a warning appears if it slips through. Colorful everyday words are otherwise kept on purpose; the writer is told to point them carefully rather than replace them. All prompts ask for niqqud on every word, following everyday spoken Israeli Hebrew rather than normative grammar (תִרְגוּם, tir-GUM).

**Avoiding a word for everyone:** add it to `rules/avoid-words.txt` (one bare word per line).

**Adding a confirmed word for everyone:** add a line `מילה = מילה מנוקדת` to `rules/voice-lexicon.txt` after hearing it. The app rejects a line whose pointed form doesn't match the bare word.

## Learning rounds

Pronunciation improves in rounds, driven by ear:

1. Render several songs and fix every word that sounds wrong (**תיקון הגייה**). Mark words no spelling can fix with **אף אפשרות לא עובדת**.
2. Copy the collected data from **המילון שלי → העתקת המילון והיסטוריית התיקונים**.
3. Fold it into `rules/`:
   - `voice-lexicon.txt`: fixed spellings for words whose reading never changes.
   - `context-words.txt`: words whose reading depends on gender, tense or meaning (לך, את, רצה). They never get a fixed spelling; stored personal spellings for them are ignored.
   - `pronunciation-rules.md`: patterns found across fixes, given to every Claude call and winning over the original voice rules on conflicts.
   - `avoid-words.txt`: words the engine cannot sing whatever the niqqud.
4. Run `npm test`: `src/lib/hebrew/rules-files.test.ts` rejects malformed lines, a context word in the fixed lexicon, a word both fixed and avoided, and a forbidden dagesh.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Lyrics generation |
| `ANTHROPIC_MODEL` | no | Default `claude-opus-5-5` |
| `LYRICS_EFFORT` | no | `low` to `max`, default `medium`. Lower is faster and cheaper |
| `ELEVENLABS_API_KEY` | no | Enables audio. Without it the app is lyrics-only |
| `ELEVENLABS_MUSIC_MODEL` | no | `music_v2_5` (default) or `music_v2` |
| `MUSIC_MAX_SONG_SECONDS` | no | Upper bound for a full song, default 120 |
| `APP_ACCESS_CODE` | no | When set, users must enter this code. Recommended for any public deployment, since every request spends API credit |

With `APP_ACCESS_CODE` set, the app opens on an entry screen. The code is checked against `POST /api/access` and kept in the browser. Every paid route still checks it on its own.

## Deploying to Netlify

Connect the repository; `netlify.toml` already sets the build. Add the environment variables in **Site configuration → Environment variables**. Netlify detects Next.js and applies its runtime automatically.

**Time limit:** Netlify functions stop after 60 seconds. Lyrics requests and previews fit comfortably. A long full song may not render within that window; if that happens, lower `MUSIC_MAX_SONG_SECONDS`, or move full-song rendering to a Netlify Background Function (15 minutes) that stores the MP3 in Netlify Blobs while the client polls.

## Scripts

```bash
npm run dev        # local development
npm test           # unit tests (Hebrew rules, song finalization, music plan)
npm run typecheck
npm run lint
npm run build
```

## Structure

```
rules/                      Voice rules, confirmed pronunciation rules, lexicon, context and avoid lists (read at runtime)
src/app/api/lyrics          POST: text + variation -> Song (Claude)
src/app/api/audio           POST: Song -> MP3 stream (ElevenLabs)
src/app/api/pronunciation   POST: word + line -> alternative voice spellings (Claude)
src/app/api/review          POST: song voice lines -> niqqud-only pronunciation fixes (Claude)
src/lib/hebrew              Pure niqqud / lexicon / voice-line utilities
src/lib/songs               Variation catalog, API contract, prompts, draft -> Song
src/lib/music               Song -> provider-neutral composition plan
src/lib/server              Env, HTTP helpers, Claude + ElevenLabs clients
src/app/api/access          POST: checks the access code for the entry screen
src/components              Studio UI (RTL, light pastel theme)
public/illustrations        Illustrations: Ronit, the app character (SVG), and decorative WebP art
art/roni                    Ronit's source drawing; `python3 art/roni/build.py` regenerates her SVGs
```
