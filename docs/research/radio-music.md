# Royalty-free music for the radio (issue #48)

Researched 2026-10-21 for [#48](https://github.com/easly1989/easly1989.github.io/issues/48),
a child of the map [#33](https://github.com/easly1989/easly1989.github.io/issues/33).
Nothing was downloaded: every fact below was read from the page it links. This is a reading of
the licence text, not legal advice.

Carlo chose the source: Pixabay. Four lo-fi tracks from the
[lo-fi search](https://pixabay.com/it/music/search/royalty%20free%20lofi/) and one post-rock track,
[Post-Rock Crescendo](https://pixabay.com/it/music/post-rock-post-rock-crescendo-537468/).

## 1. The licence

Pixabay's tracks are published under the **Pixabay Content License**. Its binding text is
section 5 of the [Terms of Service](https://pixabay.com/service/terms/) (last updated
2024-11-18); the [licence summary](https://pixabay.com/service/license-summary/) is the short
form and states no version. The pre-2019 CC0 carve-out (section 4) does not apply: it covers
only content with a published date before 2019-01-09, and every track below dates from 2026.

**What it grants** (Terms, section 5): an "irrevocable, worldwide, perpetual (or as long as
allowed by law), non-exclusive and royalty-free right" to "download, use, copy, modify or adapt
the Content for commercial or non-commercial purposes", conditional on no Prohibited Use.

**What it forbids** that could matter here:

- "You cannot sell or distribute the Content (either in digital or physical form) on a
  Standalone basis."
- "Standalone" means "where no creative effort has been applied to the Content and it remains
  in substantially the same form", and the Terms give "as an image, audio, video, NFT or other
  digital file (including through a stock media platform)" as an example.
- Using the Content "with a combination of images, videos, audio files" is "not Standalone use,
  so long as the combined effect is to make a 'new' creative work."
- No immoral, illegal, misleading or political use; no use as part of a trade-mark or business
  name; consider third-party consent (the page does not warrant that any was obtained).
- Section 8 bans scraping and bulk or systematic copying of Content.

**Attribution**: not required ("You do not need to credit Pixabay or the contributor", Terms
section 6; also the summary and the [FAQ](https://pixabay.com/service/faq/)). Credit is "always
appreciated"; the Terms suggest the form "by [Contributor] via Pixabay".

### Does it allow a public repo on GitHub Pages, played in a loop?

**Playing and looping on the site: yes.** The site is a creative work of its own, and the
licence allows use, copying and modification for commercial and non-commercial purposes. The
FAQ lists "incorporation into a greater work (e.g. adding it to a book, app, game)" as a
significant alteration, and says music in videos, OTT platforms and podcasts is fine "as long as
the music is part of a larger creative work and not distributed as a standalone file".
Looping is not mentioned anywhere as a restriction.

**Hosting the MP3 in a public repo: allowed in my reading, with a small residual risk.** The
only clause that touches it is "distribute ... on a Standalone basis". Every file served by a
website is delivered to the visitor's browser, so serving it to play it inside the room is
distribution as part of a larger work, which the licence permits. What the clause is aimed at
is offering the track itself as a file (a stock site, a music pack, a download link). A public
repo is the one place where the bare file sits listed and downloadable on its own, in the same
form Pixabay published it. That is the gap a strict reader could point at. The licence text
names no repository, no GitHub and no hosting service, and the FAQ does not address websites.

Ways to keep clear of it, cheapest first:

1. Never link the files as a download, never put them in a release, a zip or a listing page;
   keep them in one folder (for example `assets/radio/`) with a short `README` line saying the
   tracks belong to their authors and are used here under the Pixabay Content License.
2. Re-encode each one to the web bitrate and trim or fade it for the loop. Transcoding alone is
   not obviously "creative effort"; a band-limited radio filter plus fades is a creative change
   and sits more clearly under "modify or adapt", but the Terms do not define the threshold.
3. If a firm answer matters, ask Pixabay in writing (the FAQ and Terms name no contact for this
   question) and keep the reply.

### Attribution

Not required. Recommended anyway, because the radio is a natural place for it and the licence
invites it: a one-line credit per station, shown while it plays or on the About page, in the
Terms' form: "Title, by Author via Pixabay", linking the track's page. This also helps if a
track is later removed from Pixabay, since the page proves where it came from.

### Streaming from Pixabay's URLs (hotlinking)

Not a good idea, and not documented as permitted:

- The Terms do not mention hotlinking. The [API docs](https://pixabay.com/api/docs/) say
  "permanent hotlinking of images (using Pixabay URLs in your app) is not allowed" and "please
  download them to your server first"; they cover images and video only, with no audio endpoint,
  so there is no sanctioned stable URL for a track.
- The FAQ describes the way to get a track as the "Free Download" button on its media page.
- A track can be deleted by its author (the FAQ describes deleting uploads on the My Media page),
  which would silence a station with no warning.

Conclusion: self-host.

### Content ID and AI labels (not blockers, worth knowing)

- Many tracks show "Registrato con Content ID" (Content ID is YouTube's claim system). The
  [FAQ](https://pixabay.com/service/faq/) says a claim is not a strike and it affects videos
  uploaded to YouTube, Facebook and similar. It has no bearing on a website, unless someone
  later uploads a screen recording of the site.
- Many tracks carry "Generato dall'IA" (AI-generated). The FAQ says "Using AI does not change
  the Pixabay license rules." Pixabay does not warrant third-party rights in any content.

## 2. The post-rock track

| Field | Value |
|---|---|
| Title | Post-Rock Crescendo |
| Author | alex-morgan |
| Length | 3:25 |
| Format | MP3 (file size and bitrate not stated) |
| Published | 2026-06-05 |
| Labels | AI-generated, registered with Content ID |
| Licence | Pixabay Content License |
| Page | <https://pixabay.com/it/music/post-rock-post-rock-crescendo-537468/> |

## 3. Lo-fi candidates

All are MP3 on Pixabay, under the Pixabay Content License. No page states a file size or
bitrate. Lengths are from the track page. "Est." sizes are computed (bitrate x length), not
stated by Pixabay: 96 kbps stereo MP3 is the working figure (see section 4).

| Title | Author | Length | Est. at 96 kbps | AI label | Content ID | Page |
|---|---|---|---|---|---|---|
| LoFi Relax | Kulakovka | 2:20 | 1.7 MB | no | no | <https://pixabay.com/it/music/lofi-lofi-relax-570489/> |
| Lofi | Sub_Clair | 3:34 | 2.6 MB | no | yes | <https://pixabay.com/it/music/lofi-lofi-586095/> |
| Lofi | SoundSurfer | 4:00 | 2.9 MB | no | yes | <https://pixabay.com/it/music/batte-lofi-614281/> |
| Lofi Chill Vlog Beats | alex-morgan | 2:25 | 1.7 MB | yes | no | <https://pixabay.com/it/music/lofi-lofi-chill-vlog-beats-573883/> |
| Lofi Beats | The_Mountain | 2:23 | 1.7 MB | yes | yes | <https://pixabay.com/it/music/lofi-lofi-beats-567433/> |
| Lofi Relaxing | VelarioMusic | 2:25 | 1.7 MB | yes | yes | <https://pixabay.com/it/music/lofi-lofi-relaxing-598427/> |
| Tokyo Lofi | ZephiraMusic | 3:00 | 2.2 MB | yes | yes | <https://pixabay.com/it/music/lofi-tokyo-lofi-604786/> |
| Lofi Focus | ZephiraMusic | 2:22 | 1.7 MB | yes | yes | <https://pixabay.com/it/music/lofi-lofi-focus-606303/> |

Other tracks checked in the same search and left out (all by ZephiraMusic or VelarioMusic, all
AI-labelled and Content ID-registered, so no different from the above): Abstract Lofi,
Blues Lofi, Melancholy Lofi, Vintage Lofi, Lofi Chill, Lofi Music. Page genre and mood tags are
the same across the set (Lofi, Electronic; Cold, Relaxed; medium tempo), so the titles are the
only hint of difference: choosing by ear is needed. Tokyo Lofi, Vintage Lofi and Blues Lofi are
the ones whose names promise a different colour.

Two tracks are titled just "Lofi": give the author when referring to them.

Total for four lo-fi tracks plus the post-rock one at 96 kbps: roughly 8 to 11 MB, depending on
which are chosen.

## 4. Format and bitrate

Browser support, from [MDN's audio codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)
and caniuse ([mp3](https://caniuse.com/mp3), [opus](https://caniuse.com/opus),
[ogg-vorbis](https://caniuse.com/ogg-vorbis)), all for the `<audio>` element:

| Format | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| MP3 | 4+ | 12+ | 22+ | 4+ (iOS 4+) |
| Opus | 33+ | 14+ | 15+ | desktop: partial only; iOS full from 18.4 |
| Ogg Vorbis | 4+ | 17+ | 3.5+ | full from 18.4 (desktop and iOS), partial before |
| AAC | MDN gives no table; in MP4 only in Chrome (Main Profile) | | platform decoder | |

MDN's minimum recommendations for stereo at 48 kHz: MP3 128 kbps, AAC 96 kbps, Opus 96 kbps,
Vorbis 192 kbps (those are its general minimums; it also calls Opus "a good all-around audio
codec" and Vorbis more size-efficient than MP3 at the same quality).

**Only MP3 is plain-safe in every current browser.** Opus and Vorbis are not full on Safari
until 18.4, so they would need an MP3 fallback through `<source>` elements.

Recommendation: ship **MP3, 96 to 128 kbps, joint stereo or mono** (a radio on a shelf can be
mono, halving the size). A 2.5-minute track is about 1.7 to 2.3 MB stereo at 96 to 128 kbps;
the whole set of five stations lands around 8 to 14 MB, loaded one at a time when tuned. Add
Opus at about 64 kbps as a first `<source>` only if the size matters, and note that every extra
format doubles the number of binary files in the repo. Because the stations load only when
tuned to, the first-load cost is zero.

Seamless looping: the `loop` attribute exists on `<audio>`, but the gap at the loop point of an
MP3 depends on the encoder; this was not checked against a primary source here, so test it in
the prototype. A radio can also just play on to the next station-track.

## 5. Fallback if Pixabay's licence were judged not to fit

[Incompetech / Kevin MacLeod](https://incompetech.com/music/royalty-free/faq.html) is licensed
CC BY 4.0 and requires a visible credit ("Title Kevin MacLeod (incompetech.com), Licensed under
Creative Commons: By Attribution 4.0", with the licence link); its FAQ does not address website
hosting or looping, and the CC BY 4.0 licence has no standalone clause. Nothing else was
researched, since Carlo chose Pixabay.
