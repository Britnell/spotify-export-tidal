import { computed, onMounted, ref, watch } from "vue";
import {
  generateOAuthCodeChallenge,
  sha256,
  base64URLEncode,
} from "../tidal-sdk-web/packages/auth/src/utils/utils";

const redirectUri = import.meta.env.DEV
  ? "http://localhost:5173/app"
  : "https://spotify-tidal-transfer.com/app";

export async function generateSpotifyLoginUrl() {
  const codeVerifier = generateOAuthCodeChallenge();
  const codeChallenge = await sha256(codeVerifier);

  // Store code verifier for token exchange
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: "37e3c48b005d4e0f827b0e135ed8e58d",
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge: base64URLEncode(codeChallenge),
    code_challenge_method: "S256",
    scope:
      "playlist-read-private playlist-read-collaborative user-read-private user-read-email",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export const href =
  "https://accounts.spotify.com/authorize" +
  "?client_id=37e3c48b005d4e0f827b0e135ed8e58d&response_type=token&redirect_uri=" +
  encodeURIComponent(redirectUri);

export type SPL = {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: {
    total: number;
  };
};

export type STrack = {
  id: string;
  name: string;
  duration_ms: number;
  album: {
    name: string;
    release_date: string;
  };
  artists: {
    name: string;
  }[];
  external_ids: {
    isrc: string;
  };
};

// "Unable to verify challenge with id 75ee768e-33b8-4b9f-8d42-6b6fbf81fe10"

export function useSpotify() {
  const token = ref("");
  const loggedin = computed(() => !!token.value);
  const playlists = ref<SPL[]>([]);
  // const username = ref('');
  const selected = ref<SPL | null>();
  const tracks = ref<STrack[]>([]);
  const loginUrl = ref("");

  onMounted(async () => {
    loginUrl.value = await generateSpotifyLoginUrl();
  });

  onMounted(() => {
    const storedToken = localStorage.getItem("spotify_token");
    if (storedToken) {
      token.value = storedToken;
    }
  });

  watch(token, async () => {
    if (!token.value) return;

    // load user playlists
    const resp = await getUsersPlaylists(token.value);
    if (resp) {
      resp.sort((a, b) => (a.name > b.name ? 1 : -1));
      playlists.value = resp;
    }
  });

  onMounted(async () => {
    // check url code
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");

    if (authCode) {
      try {
        await exchangeCodeForToken(authCode);
        window.location.replace("/app");
        return;
      } catch (error) {
        console.error("Token exchange failed:", error);
        clearToken();
        return;
      }
    }
  });

  const clearToken = () => {
    token.value = "";
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_code_verifier");
  };

  const exchangeCodeForToken = async (code: string) => {
    const codeVerifier = localStorage.getItem("spotify_code_verifier");
    if (!codeVerifier) {
      throw new Error("No code verifier found");
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: "37e3c48b005d4e0f827b0e135ed8e58d",
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error("Token exchange failed: " + response.status);
    }

    const data = await response.json();
    localStorage.setItem("spotify_token", data.access_token);
    token.value = data.access_token;

    // Clear the verifier after use
    localStorage.removeItem("spotify_code_verifier");

    return data.access_token;
  };

  type apireturn = {
    limit: number;
    total: number;
    items: any[];
    next: string;
  };

  const spotifyApi = async (
    path: string,
    tokenValue: string,
  ): Promise<apireturn | null> => {
    try {
      const res = await fetch("https://api.spotify.com/v1" + path, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      if (!res.ok) {
        throw new Error("Spotify API error: " + res.status);
      }

      return res.json();
    } catch (error) {
      console.error(path, error);
      // clearToken();
      return null;
    }
  };

  const getUsersPlaylists = async (tokenValue: string) => {
    let allPlaylists: SPL[] = [];
    let nextUrl = "/me/playlists";

    while (nextUrl) {
      const res = await spotifyApi(nextUrl, tokenValue);
      if (!res) break;
      allPlaylists = allPlaylists.concat(res.items as SPL[]);
      nextUrl = res.next;
      if (nextUrl) {
        nextUrl = nextUrl.replace("https://api.spotify.com/v1", "");
        await delay(500);
      }
    }
    return allPlaylists;
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const getPlaylistTracks = async (id: string, tokenValue: string) => {
    let allTracks: any[] = [];
    let nextUrl = `/playlists/${id}/tracks`;

    while (nextUrl) {
      const res = await spotifyApi(nextUrl, tokenValue);
      if (!res) break;
      allTracks = allTracks.concat(res.items.map((row) => row.track));
      nextUrl = res.next;
      if (nextUrl) {
        nextUrl = nextUrl.replace("https://api.spotify.com/v1", "");
        await delay(500);
      }
    }
    return allTracks;
  };

  return {
    loggedin,
    token,
    href,
    loginUrl,
    clearToken,
    spotifyApi,
    playlists,
    getPlaylistTracks,
    selected,
    tracks,
  };
}

export function exportTracksToCsv(tracks: STrack[]): string {
  const headers = ["Song Name", "Artists", "Album Name", "Album Release Date"];
  const csvContent = [
    headers.join(";"),
    ...tracks.map((track) =>
      [
        track.name,
        track.artists.map((artist) => artist.name).join(","),
        track.album.name,
        track.album.release_date,
      ].join(";"),
    ),
  ].join("\n");

  return csvContent;
}

export function downloadCsvFile(
  tracks: STrack[],
  filename: string = "tracks.csv",
): void {
  const csvContent = exportTracksToCsv(tracks);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
