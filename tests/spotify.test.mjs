import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, mock } from "node:test";
import {
  CLIENT_ID, REDIRECT_URI, createProof, exportPlaylist, filename,
  formatItem, loadLibrary, makeText, parsePlaylistId, SpotifyError,
} from "../app/lab/spotify-to-txt/spotify.ts";

const id = "3cEYpjA9oz9GiPac4AsH4n";
const session = { accessToken: "test-token", expiresAt: Date.now() + 3_600_000 };
const song = { type: "track", name: "Déjà vu", artists: [{ name: "Björk" }] };
const json = value => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });

test("PKCE generates a valid S256 challenge without a client secret", async () => {
  const { verifier, challenge } = await createProof();
  assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(challenge, createHash("sha256").update(verifier).digest("base64url"));
  assert.equal(REDIRECT_URI, "https://www.kmproto.com/lab/spotify-to-txt");
});

test("playlist inputs accept shared links, localized links, URIs and IDs", () => {
  for (const value of [id, `spotify:playlist:${id}`, `https://open.spotify.com/playlist/${id}?si=abc`, `https://open.spotify.com/intl-de/playlist/${id}`]) {
    assert.equal(parsePlaylistId(value), id);
  }
  for (const value of ["bad", `https://example.com/playlist/${id}`, `https://open.spotify.com/album/${id}`]) {
    assert.throws(() => parsePlaylistId(value), SpotifyError);
  }
});

test("text preserves order, duplicate tracks, Unicode and unavailable entries", () => {
  const text = makeText("Favorites", id, [{ item: song }, { track: song }, { item: null }, null], false);
  assert.equal(text, `Favorites\r\nSource: Spotify | https://open.spotify.com/playlist/${id}\r\n\r\n1. Björk - Déjà vu\r\n2. Björk - Déjà vu\r\n3. [Unavailable item]\r\n4. [Unavailable item]\r\n`);
  assert.equal(formatItem({ item: null, track: song }, false), "[Unavailable item]");
  assert.match(makeText("Empty", id, [], false), /\[Empty playlist\]/);
});

test("episodes, local files, guest artists and optional links are readable", () => {
  assert.equal(formatItem({ item: { type: "episode", name: "Part\nOne", show: { name: "A Show" } } }, false), "A Show - Part One");
  assert.equal(formatItem({ item: song, is_local: true }, false), "Björk - Déjà vu [local file]");
  const guest = { ...song, artists: [...song.artists, { name: "Guest" }], external_urls: { spotify: "https://open.spotify.com/track/example" } };
  assert.equal(formatItem({ item: guest }, true), "Björk, Guest - Déjà vu | https://open.spotify.com/track/example");
  assert.equal(filename('Sunday: <Favorites> / "songs"?\n'), "Sunday Favorites  songs.txt");
  assert.equal(filename("..."), "playlist.txt");
});

test("export fetches every page before returning a downloadable file", async t => {
  const calls = [];
  const next = `https://api.spotify.com/v1/playlists/${id}/items?offset=50`;
  const responses = [{ name: "Favorites" }, { items: [{ item: song }], next }, { items: [{ track: song }], next: null }];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    return json(responses.shift());
  });
  const progress = [];
  const result = await exportPlaylist(id, session, false, count => progress.push(count));
  assert.equal(result.count, 2);
  assert.deepEqual(progress, [1, 2]);
  assert.match(calls[1], /\/items\?limit=50/);
  assert.equal(calls[2], next);
  assert.match(result.text, /2\. Björk/);
});

test("library includes owned and collaborative playlists across all pages", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    const path = new URL(url).pathname;
    if (path === "/v1/me") return json({ id: "dad", display_name: "Dad" });
    if (url.includes("offset=50")) return json({ items: [{ id: "collab", collaborative: true, owner: { id: "family" } }], next: null });
    return json({ items: [{ id: "mine", owner: { id: "dad" } }, { id: "followed", owner: { id: "someone-else" } }, null], next: "https://api.spotify.com/v1/me/playlists?offset=50" });
  });
  const library = await loadLibrary(session);
  assert.equal(library.profile.display_name, "Dad");
  assert.deepEqual(library.playlists.map(p => p.id), ["mine", "collab"]);
});

test("failed or missing contents never become an empty successful export", async t => {
  t.mock.method(globalThis, "fetch", async url => url.includes("fields=name") ? json({ name: "Denied" }) : new Response(null, { status: 403 }));
  await assert.rejects(exportPlaylist(id, session, false), error => error.status === 403 && /allowed user/.test(error.message));
  mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => json({ name: "Missing" }));
  await assert.rejects(exportPlaylist(id, session, false), /did not return/);
});

test("untrusted pagination cannot receive the bearer token", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return json(calls === 1 ? { name: "Favorites" } : { items: [], next: "https://example.com/steal" });
  });
  await assert.rejects(exportPlaylist(id, session, false), /unexpected page address/);
  assert.equal(calls, 2);
});

test("expired sessions and rate limits give actionable errors", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429, headers: { "Retry-After": "60" } }));
  await assert.rejects(exportPlaylist(id, { ...session, expiresAt: 0 }, false), error => error.status === 401);
  await assert.rejects(exportPlaylist(id, session, false), /60 seconds/);
});

function browserState(query, proof) {
  const values = new Map(proof ? [["kmproto.spotify.auth.v1", JSON.stringify(proof)]] : []);
  const history = [];
  return {
    values, history,
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    window: { location: { href: `${REDIRECT_URI}?${query}`, pathname: "/lab/spotify-to-txt" }, history: { replaceState: (...args) => history.push(args) } },
  };
}

function installBrowser(t, browser) {
  for (const [key, value] of [["window", browser.window], ["sessionStorage", browser.storage]]) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
}

test("callback validates state and deduplicates the single-use code exchange", async t => {
  const browser = browserState("code=auth-code&state=good", { state: "good", verifier: "verifier", createdAt: Date.now() });
  installBrowser(t, browser);
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://accounts.spotify.com/api/token");
    assert.equal(options.body.get("code_verifier"), "verifier");
    assert.equal(options.body.get("client_id"), CLIENT_ID);
    assert.equal(options.body.get("redirect_uri"), REDIRECT_URI);
    return json({ access_token: "new-token", expires_in: 3600 });
  });
  const app = await import("../app/lab/spotify-to-txt/spotify.ts?auth-success");
  const first = app.initializeSpotify();
  assert.equal(first, app.initializeSpotify());
  assert.equal((await first).accessToken, "new-token");
  assert.equal(fetch.mock.calls.length, 1);
  assert.equal(browser.history[0][2], "/lab/spotify-to-txt");
  assert.equal(browser.values.has("kmproto.spotify.auth.v1"), false);
  app.disconnect();
  assert.equal(browser.values.size, 0);
});

test("forged and cancelled callbacks cannot exchange an authorization code", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => assert.fail("Must not exchange an invalid callback"));
  for (const [index, query] of ["code=bad&state=wrong", "error=access_denied&state=good"].entries()) {
    await t.test(`callback ${index}`, async subtest => {
      const browser = browserState(query, { state: "good", verifier: "verifier", createdAt: Date.now() });
      installBrowser(subtest, browser);
      const app = await import(`../app/lab/spotify-to-txt/spotify.ts?invalid=${index}`);
      await assert.rejects(app.initializeSpotify(), /verified|cancelled/);
      assert.equal(browser.values.size, 0);
    });
  }
  assert.equal(fetch.mock.calls.length, 0);
});
