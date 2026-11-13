import type { Metadata } from "next";
import PlaylistExporter from "./PlaylistExporter";

export const metadata: Metadata = {
  title: "Spotify Playlist to TXT | KM Proto Lab",
  description: "Save a Spotify playlist as a readable text file of songs and artists. Connect, choose a playlist, and download your list.",
  alternates: { canonical: "https://www.kmproto.com/lab/spotify-to-txt" },
  referrer: "no-referrer",
};

export default function SpotifyToTxtPage() {
  return <PlaylistExporter />;
}
