# Playlist to TXT

Family-facing Spotify playlist export at `/lab/spotify-to-txt`, listed in the
KM Proto Lab. The browser uses Spotify's Authorization Code with PKCE flow;
there is no server, Client Secret, database, or additional runtime dependency.

## Spotify dashboard setup

Use the existing Spotify app with public Client ID
`65197c01e1ab4bbdb5e1ef361652a241`.

1. Enable Web API access for the app.
2. Add and save this **exact** redirect URI:
   `https://www.kmproto.com/lab/spotify-to-txt`.
3. Add the father's Spotify account under **User Management**. Other family
   members must also be allowed users while the app is in Development Mode.
4. Keep the app owner's Spotify Premium subscription active.

The `www` host and lack of a trailing slash matter. Do not substitute the bare
domain, a preview URL, or an HTTP URI. The Connect button takes visitors on
other hosts to the canonical production address before starting sign-in.
For a local OAuth integration test, register a separate loopback callback and
explicitly change `REDIRECT_URI` in a local branch; never deploy that change.

Spotify documents HTTPS redirects and its loopback HTTP exception in
[Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).
Its [Development Mode migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
documents Premium, user limits, and playlist ownership restrictions.

## Use

Open the tool from The Lab, choose **Connect Spotify**, and approve playlist
read access. Choose a playlist or paste its Share link, optionally include song
links, and select **Create text file**. Review the text and choose **Download
text file** or **Copy text**.

Only owned and collaborative playlists are shown. Spotify's current
`/playlists/{id}/items` endpoint is used, with support for both `item` and older
`track` fields. Every playlist and item page is read, preserving order and
duplicates. Null entries get placeholders; local files and podcast episodes
are labeled. A failed fetch cannot produce a partial download.

Sign-in proof and the short-lived access token use `sessionStorage`; no refresh
token is retained. Disconnect removes this tab's connection. If a connection
expires, sign in again. Requests go directly to Spotify, and the text download
is generated with a local Blob URL. OAuth query parameters are removed before
API calls. The page sets `no-referrer` and does not include analytics scripts.

## Development and verification

- `app/lab/spotify-to-txt/spotify.ts`: OAuth, API paging, validation, formatting.
- `PlaylistExporter.tsx` and `spotify-to-txt.css`: accessible React UI.
- `page.tsx`: app-router entry; `src/spotify-to-txt.tsx` and
  `lab/spotify-to-txt.html`: production Vite entry, registered in
  `vite.vercel.config.ts`.
- `app/data.ts`: Lab directory entry.

Run from the repository root:

```bash
mise exec -- npm run test:spotify
mise exec -- npx tsc --noEmit
mise exec -- npm run build:vercel
```

The automated tests simulate Spotify responses and browser storage. Production
sign-in requires the saved Spotify dashboard settings and an allowed user's
approval. Visual browser QA and a live sign-in are separate checks.
