# סטודיו לשירים

A Next.js app that turns free text about a person (or anything else) into original Hebrew songs, in several style variations at once. Songs can then be sung with AI music generation.

- **Lyrics:** Claude writes each variation as a separate request, following [`rules/HEBREW_VOICE_RULES_FOR_BOTS.md`](rules/HEBREW_VOICE_RULES_FOR_BOTS.md).
- **Audio (optional):** ElevenLabs Music renders a short preview (name plus the risky words, per rule 7.6) or the full song.

## How the Hebrew voice rules are applied

The model writes only the **voice** version of each line. The server then applies the mechanical rules deterministically, so they hold even when the model slips:

| Rule | Where |
|---|---|
| Display text has no niqqud: derived by stripping the voice text, so the two never drift apart | `src/lib/hebrew/niqqud.ts` |
| Dagesh only in בּ/כּ/פּ; shuruk (וּ) kept | `removeDisallowedDagesh` |
| No long dash (— / –) | `prepareVoiceLine` |
| Confirmed lexicon spellings, prefixes kept (ואחַת) | `rules/voice-lexicon.txt`, `src/lib/hebrew/lexicon.ts` |
| A person's name spelled the same way everywhere | name entries in `finalizeSong` |
| Numbers written as digits, Latin words | shown as warnings on the song card |

Stress placement, rhyme on stressed syllables and balanced lines are handled by the model through the rules document, which goes into the system prompt verbatim (and is prompt-cached).

## Fixing pronunciation by ear

On a song card, **תיקון הגייה** turns every word into a button. Clicking a word that was sung wrongly asks Claude for three or four alternative voice spellings (same letters, different niqqud). Each option can be heard sung in its line, next to the current spelling. The chosen spelling is applied to the line or to the whole song, and can be remembered in **המילון שלי**. That personal dictionary is kept in the browser and sent with every new song, so a word fixed once stays fixed.

**Adding a confirmed word for everyone:** add a line `מילה = מילה מנוקדת` to `rules/voice-lexicon.txt` after hearing it. The app rejects a line whose pointed form doesn't match the bare word.

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
rules/                      Hebrew voice rules + confirmed lexicon (read at runtime)
src/app/api/lyrics          POST: text + variation -> Song (Claude)
src/app/api/audio           POST: Song -> MP3 stream (ElevenLabs)
src/app/api/pronunciation   POST: word + line -> alternative voice spellings (Claude)
src/lib/hebrew              Pure niqqud / lexicon / voice-line utilities
src/lib/songs               Variation catalog, API contract, prompts, draft -> Song
src/lib/music               Song -> provider-neutral composition plan
src/lib/server              Env, HTTP helpers, Claude + ElevenLabs clients
src/components              Studio UI (RTL)
```
