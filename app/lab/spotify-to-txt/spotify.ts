// A Spotify Client ID is public. This app uses PKCE and has no Client Secret.
export const CLIENT_ID = "65197c01e1ab4bbdb5e1ef361652a241";
export const REDIRECT_URI = "https://www.kmproto.com/lab/spotify-to-txt";
const API = "https://api.spotify.com/v1/";
const AUTH_KEY = "kmproto.spotify.auth.v1";
const SESSION_KEY = "kmproto.spotify.session.v1";

export type Session = { accessToken: string; expiresAt: number };
export type Playlist = {
  id: string;
  name: string;
  collaborative?: boolean;
  owner?: { id: string; display_name?: string };
  items?: { total: number };
  tracks?: { total: number };
};
export type Profile = { id: string; display_name?: string };
type Item = {
  type?: string;
  name?: string;
  artists?: { name: string }[];
  show?: { name?: string };
  is_local?: boolean;
  external_urls?: { spotify?: string };
};
export type PlaylistItem = { item?: Item | null; track?: Item | null; is_local?: boolean };

export class SpotifyError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "SpotifyError";
    this.status = status;
  }
}

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function createProof() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export async function beginSignIn() {
  if (window.location.origin !== new URL(REDIRECT_URI).origin) {
    window.location.assign(REDIRECT_URI);
    return;
  }
  const { verifier, challenge } = await createProof();
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ verifier, state, createdAt: Date.now() }));
  } catch {
    throw new SpotifyError("Allow this site to use browser storage, then connect again. Your sign-in is kept only in this tab.");
  }
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "playlist-read-private",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${query}`);
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);
    response = await fetch(url, { ...options, signal });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new SpotifyError("Could not reach Spotify. Check your connection and try again.");
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Spotify could not complete sign-in. Try connecting again. If this continues, the app owner needs to check its redirect address.",
      401: "Your Spotify connection has expired. Connect again to continue.",
      403: "Spotify denied access. Make sure this account is an allowed user of the app and you own or collaborate on the playlist. The app owner also needs an active Premium subscription.",
      404: "This playlist could not be found. Check the link and make sure you can open it in Spotify.",
      429: `Spotify needs a short break. Try again ${response.headers.get("Retry-After") ? `after ${response.headers.get("Retry-After")} seconds` : "in a little while"}.`,
    };
    throw new SpotifyError(messages[response.status] || "Spotify is having trouble. Please try again later.", response.status);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new SpotifyError("Spotify sent an unexpected response. Please try again.");
  }
}

async function restoreSession(): Promise<Session | null> {
  const url = new URL(window.location.href);
  const callback = url.searchParams.has("code") || url.searchParams.has("error");
  if (callback) {
    // Remove the authorization code before rendering links or calling Spotify.
    window.history.replaceState(null, "", window.location.pathname);
    const raw = sessionStorage.getItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    const proof = raw ? JSON.parse(raw) : null;
    if (!proof || !url.searchParams.get("state") || proof.state !== url.searchParams.get("state") ||
        typeof proof.verifier !== "string" || !Number.isFinite(proof.createdAt) || Date.now() - proof.createdAt > 600_000) {
      throw new SpotifyError("That sign-in could not be verified. Connect again in this tab.");
    }
    if (url.searchParams.has("error")) {
      throw new SpotifyError("You cancelled Spotify sign-in. Connect whenever you are ready.");
    }
    const data = await fetchJson<{ access_token: string; expires_in: number }>("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code: url.searchParams.get("code") || "",
        redirect_uri: REDIRECT_URI,
        code_verifier: proof.verifier,
      }),
    });
    if (!data.access_token || !(data.expires_in > 0)) throw new SpotifyError("Spotify did not return a valid connection. Please connect again.");
    const session = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) as Session : null;
    if (session?.accessToken && session.expiresAt > Date.now() + 30_000) return session;
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* A fresh sign-in explains storage restrictions if needed. */ }
  return null;
}

// React StrictMode can mount twice. Exchange the single-use code once per load.
let initialization: Promise<Session | null> | undefined;
export function initializeSpotify() {
  initialization ??= restoreSession();
  return initialization;
}

export function disconnect() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  initialization = Promise.resolve(null);
}

async function apiGet<T>(path: string, session: Session, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, API);
  if (url.origin !== "https://api.spotify.com" || !url.pathname.startsWith("/v1/")) {
    throw new SpotifyError("Spotify sent an unexpected page address. Please try again.");
  }
  if (session.expiresAt <= Date.now()) throw new SpotifyError("Your Spotify connection has expired. Connect again to continue.", 401);
  return fetchJson<T>(url.href, { headers: { Authorization: `Bearer ${session.accessToken}` }, signal });
}

async function allPages<T>(path: string, session: Session, signal?: AbortSignal, onProgress?: (count: number) => void) {
  const result: T[] = [];
  const seen = new Set<string>();
  let next: string | null = path;
  while (next) {
    if (seen.has(next)) throw new SpotifyError("Spotify repeated a page. Please try again; no incomplete file has been downloaded.");
    seen.add(next);
    const page: { items: (T | null)[]; next: string | null } = await apiGet(next, session, signal);
    if (!Array.isArray(page.items)) throw new SpotifyError("Spotify did not return the playlist contents. Make sure you own or collaborate on this playlist.");
    result.push(...page.items as T[]);
    onProgress?.(result.length);
    next = page.next;
  }
  return result;
}

export async function loadLibrary(session: Session, signal?: AbortSignal) {
  const [profile, playlists] = await Promise.all([
    apiGet<Profile>("me", session, signal),
    allPages<Playlist>("me/playlists?limit=50", session, signal),
  ]);
  // Spotify no longer exposes followed playlists' contents to development apps.
  return { profile, playlists: playlists.filter(p => p && (p.owner?.id === profile.id || p.collaborative)) };
}

export function parsePlaylistId(value: string) {
  let id = value.trim();
  if (id.startsWith("spotify:playlist:")) id = id.slice("spotify:playlist:".length);
  else if (id.startsWith("https://")) {
    const url = new URL(id);
    const match = url.pathname.match(/^\/(?:intl-[a-zA-Z-]+\/)?playlist\/([A-Za-z0-9]{22})\/?$/);
    if (url.hostname !== "open.spotify.com" || !match) throw new SpotifyError("Paste a Spotify playlist link, rather than an album or song link.");
    id = match[1];
  }
  if (!/^[A-Za-z0-9]{22}$/.test(id)) throw new SpotifyError("Paste the playlist link from Spotify’s Share menu.");
  return id;
}

const oneLine = (value?: string) => (value || "").replace(/\s+/g, " ").trim();

export function formatItem(wrapper: PlaylistItem | null, includeLinks: boolean) {
  const item = wrapper && ("item" in wrapper ? wrapper.item : wrapper.track);
  if (!item) return "[Unavailable item]";
  const artist = item.type === "episode" ? oneLine(item.show?.name) || "Podcast"
    : (item.artists || []).map(artist => oneLine(artist.name)).filter(Boolean).join(", ") || "Unknown artist";
  const local = item.is_local || wrapper?.is_local ? " [local file]" : "";
  const link = includeLinks && item.external_urls?.spotify ? ` | ${item.external_urls.spotify}` : "";
  return `${artist} - ${oneLine(item.name) || "[Untitled item]"}${local}${link}`;
}

export function makeText(name: string, id: string, items: (PlaylistItem | null)[], includeLinks: boolean) {
  const lines = [oneLine(name), `Source: Spotify | https://open.spotify.com/playlist/${id}`, ""];
  if (items.length) items.forEach((item, i) => lines.push(`${i + 1}. ${formatItem(item, includeLinks)}`));
  else lines.push("[Empty playlist]");
  return lines.join("\r\n") + "\r\n";
}

export function filename(name: string) {
  const clean = Array.from(name).filter(char => char.charCodeAt(0) > 31).join("")
    .replace(/[<>:"/\\|?*]/g, "").trim().replace(/[. ]+$/, "").slice(0, 120);
  return `${clean || "playlist"}.txt`;
}

export async function exportPlaylist(id: string, session: Session, includeLinks: boolean, onProgress?: (count: number) => void) {
  const metadata = await apiGet<{ name: string }>(`playlists/${id}?fields=name`, session);
  const items = await allPages<PlaylistItem>(`playlists/${id}/items?limit=50&additional_types=track,episode`, session, undefined, onProgress);
  return { name: metadata.name, count: items.length, text: makeText(metadata.name, id, items, includeLinks) };
}
