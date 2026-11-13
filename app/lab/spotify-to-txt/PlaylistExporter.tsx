"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Footer, Header } from "../../components/chrome";
import {
  beginSignIn, disconnect, exportPlaylist, filename, initializeSpotify,
  loadLibrary, parsePlaylistId, SpotifyError,
} from "./spotify";
import type { Playlist, Profile, Session } from "./spotify";
import "./spotify-to-txt.css";

type Result = { name: string; count: number; text: string; id: string; downloadUrl: string };

function SpotifyMark() {
  return <svg className="spotify-mark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="currentColor" /><g fill="none" stroke="var(--paper)" strokeLinecap="round"><path strokeWidth="1.8" d="M5.5 9c4.5-1.4 9.1-.9 13 1.1" /><path strokeWidth="1.6" d="M6.3 12.4c3.8-1.2 7.6-.7 10.8 1" /><path strokeWidth="1.4" d="M7.2 15.6c3-.9 6-.5 8.8.8" /></g></svg>;
}

export default function PlaylistExporter() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState("");
  const [link, setLink] = useState("");
  const [includeLinks, setIncludeLinks] = useState(false);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState("Checking your Spotify connection…");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        const restored = await initializeSpotify();
        if (!active) return;
        setSession(restored);
        if (restored) {
          setStatus("Loading your playlists…");
          const library = await loadLibrary(restored, controller.signal);
          if (!active) return;
          setProfile(library.profile);
          setPlaylists(library.playlists);
          setSelected(library.playlists[0]?.id || "");
          setStatus("Connected. Choose a playlist below.");
        } else setStatus("Connect your account to get started.");
      } catch (error) {
        if (!active) return;
        if (error instanceof SpotifyError && error.status === 401) {
          disconnect();
          setSession(null);
        }
        setError(error instanceof SpotifyError ? error.message : "Could not finish connecting. Allow browser storage for this site and try again.");
        setStatus("");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!result) return;
    resultHeading.current?.focus();
    return () => URL.revokeObjectURL(result.downloadUrl);
  }, [result]);

  function handleError(error: unknown) {
    if (error instanceof SpotifyError && error.status === 401) {
      disconnect();
      setSession(null);
      setPlaylists([]);
      setProfile(null);
    }
    setError(error instanceof SpotifyError ? error.message : "Something went wrong. Please try again.");
    setStatus("");
  }

  async function connect() {
    setBusy(true);
    setError("");
    setStatus("Opening Spotify sign-in…");
    try { await beginSignIn(); }
    catch (error) { handleError(error); setBusy(false); }
  }

  async function refresh() {
    if (!session) return;
    setBusy(true);
    setError("");
    setStatus("Loading your playlists…");
    try {
      const library = await loadLibrary(session);
      setProfile(library.profile);
      setPlaylists(library.playlists);
      setSelected(library.playlists[0]?.id || "");
      setStatus("Playlists updated.");
    } catch (error) { handleError(error); }
    finally { setBusy(false); }
  }

  async function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const id = link.trim() ? parsePlaylistId(link) : parsePlaylistId(selected);
      setBusy(true);
      setStatus("Reading your playlist…");
      const exported = await exportPlaylist(id, session, includeLinks, count => setStatus(`Read ${count} playlist items…`));
      const downloadUrl = URL.createObjectURL(new Blob([exported.text], { type: "text/plain;charset=utf-8" }));
      setResult({ ...exported, id, downloadUrl });
      setStatus(`${exported.count} playlist items ready to download.`);
    } catch (error) { handleError(error); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.text); setCopied(true); }
    catch { setError("Copy is unavailable in this browser. Use Download text file instead."); }
  }

  function signOut() {
    disconnect();
    setSession(null);
    setProfile(null);
    setPlaylists([]);
    setSelected("");
    setLink("");
    setResult(null);
    setError("");
    setStatus("Disconnected from this tool.");
  }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header current="lab" />
    <main id="main" className="playlist-tool" tabIndex={-1}>
      <section className="playlist-intro">
        <div className="shell">
          <a className="text-link" href="/lab">← Back to the Lab</a>
          <p className="eyebrow">Music tools / Playlist to TXT</p>
          <h1>Your playlist,<br />in plain text.</h1>
          <p className="hero-lede">Save a readable list of songs and artists. Connect Spotify, choose a playlist, and download a text file you can keep or share.</p>
          <ol className="playlist-steps" aria-label="How it works">
            <li><span>1</span> Connect Spotify</li><li><span>2</span> Choose a playlist</li><li><span>3</span> Download your list</li>
          </ol>
        </div>
      </section>
      <section className="section">
        <div className="shell playlist-layout">
          <div className="playlist-workspace" aria-busy={busy}>
            <div className="playlist-panel-head">
              <h2>{session ? "Choose your playlist" : "Start with Spotify"}</h2>
              {session ? <button className="playlist-text-button" onClick={signOut} disabled={busy}>Disconnect</button> : null}
            </div>
            <p className="playlist-status" role="status">{status}</p>
            {error ? <p className="playlist-error" role="alert">{error}</p> : null}
            {!session ? <>
              <p>Sign in securely on Spotify. This tool asks for permission to read your playlists.</p>
              <button className="button button-primary playlist-connect" disabled={busy} onClick={connect}><SpotifyMark /> Connect Spotify <Arrow /></button>
              <p className="playlist-small">No installation needed. Your playlists stay as they are.</p>
            </> : <>
              <p className="playlist-account"><span className="playlist-dot" aria-hidden="true" /> Connected{profile?.display_name ? ` as ${profile.display_name}` : " to Spotify"}</p>
              <form onSubmit={prepare}>
                <label className="playlist-label" htmlFor="playlist-select">Your playlists</label>
                <div className="playlist-picker">
                  <select id="playlist-select" value={selected} disabled={busy || !playlists.length} onChange={e => { setSelected(e.target.value); setLink(""); }}>
                    {!playlists.length ? <option value="">No playlists to show</option> : playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="playlist-text-button" type="button" disabled={busy} onClick={refresh}>Refresh list</button>
                </div>
                {!playlists.length && !busy ? <p className="playlist-small">Create a playlist in Spotify, then refresh this list. You can also paste a playlist link below.</p> : null}
                <label className="playlist-label" htmlFor="playlist-link">Or paste a playlist link</label>
                <input id="playlist-link" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://open.spotify.com/playlist/…" value={link} disabled={busy} onChange={e => setLink(e.target.value)} aria-describedby="playlist-link-help" />
                <p id="playlist-link-help" className="playlist-small">In Spotify, open the playlist, choose Share, then Copy link to playlist.</p>
                <label className="playlist-check"><input type="checkbox" checked={includeLinks} disabled={busy} onChange={e => setIncludeLinks(e.target.checked)} /> Include a Spotify link for each song</label>
                <button type="submit" className="button button-primary playlist-prepare" disabled={busy || (!selected && !link.trim())}>{busy ? "Reading playlist…" : "Create text file"} <Arrow /></button>
              </form>
            </>}
            {result ? <section className="playlist-result" aria-labelledby="playlist-result-title">
              <p className="eyebrow">Ready to save</p>
              <h2 id="playlist-result-title" ref={resultHeading} tabIndex={-1}>{result.name}</h2>
              <p>{result.count} playlist {result.count === 1 ? "item" : "items"} · .txt file</p>
              <div className="actions">
                <a className="button button-primary" href={result.downloadUrl} download={filename(result.name)}>Download text file ↓</a>
                <button className="button button-secondary" onClick={copy}>{copied ? "Copied!" : "Copy text"}</button>
              </div>
              <label className="playlist-label" htmlFor="playlist-preview">Your text file</label>
              <textarea id="playlist-preview" className="playlist-preview" readOnly value={result.text} rows={10} spellCheck={false} />
              <a className="text-link" href={`https://open.spotify.com/playlist/${result.id}`} target="_blank" rel="noreferrer"><SpotifyMark /> Open playlist in Spotify <Arrow diagonal /></a>
            </section> : null}
          </div>
          <aside className="playlist-aside" aria-label="About the export">
            <div className="playlist-paper" aria-hidden="true"><p>My favorite songs.txt</p><hr /><span>1. Artist — Song title</span><span>2. Artist — Song title</span><span>3. Artist — Song title</span><span className="playlist-paper-fade">4. Artist — Song title</span></div>
            <h2>A list you can use anywhere.</h2>
            <p>Song names and artists, in playlist order. Open the file in Notepad, print it, or send it to someone.</p>
            <details>
              <summary>Which playlists can I export?</summary>
              <p>Spotify allows this tool to read playlists you own or collaborate on. If you follow someone else’s playlist, first copy its songs into a new playlist of your own in Spotify.</p>
            </details>
            <details>
              <summary>What happens to my data?</summary>
              <p>Your browser talks directly to Spotify. Your connection is kept in this tab’s temporary storage, and your text file is created on your device. KM Proto does not receive your Spotify token or playlist contents. Disconnect to clear this tool’s connection.</p>
              <p>You can also remove this app from <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noreferrer">your Spotify account’s app settings</a>.</p>
            </details>
            <details>
              <summary>Having trouble signing in?</summary>
              <p>This is a small family tool. The app owner must add your Spotify account to the app’s allowed users. If Spotify says you do not have access, ask the owner to check User Management in the Spotify Developer Dashboard.</p>
            </details>
          </aside>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
