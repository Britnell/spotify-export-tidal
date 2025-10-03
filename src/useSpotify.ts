import { onMounted, ref } from 'vue';

export const href =
  'https://accounts.spotify.com/authorize' +
  '?client_id=37e3c48b005d4e0f827b0e135ed8e58d&response_type=token&redirect_uri=' +
  encodeURIComponent('http://localhost:5173');

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

export function useSpotify() {
  const loggedin = ref(false);
  const token = ref('');

  onMounted(() => {
    const url = new URLSearchParams(window.location.hash.slice(1));
    const urlToken = url.get('access_token');

    if (urlToken) {
      localStorage.setItem('spotify_token', urlToken);
      token.value = urlToken;
    } else {
      const storedToken = localStorage.getItem('spotify_token');
      if (storedToken) {
        token.value = storedToken;
      }
    }

    loggedin.value = !!token.value;
  });

  const clearToken = () => {
    token.value = '';
    loggedin.value = false;
    localStorage.removeItem('spotify_token');
  };

  type apireturn = {
    limit: number;
    total: number;
    items: any[];
    next: string;
  };

  const spotifyApi = async (path: string, tokenValue: string): Promise<apireturn | null> => {
    try {
      const res = await fetch('https://api.spotify.com/v1' + path, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      if (!res.ok) {
        throw new Error('Spotify API error: ' + res.status);
      }

      return res.json();
    } catch (error) {
      console.error(error);
      clearToken();
      return null;
    }
  };

  const getUsersPlaylists = async (tokenValue: string) => {
    const res = await spotifyApi('/me/playlists', tokenValue);
    if (res?.items) return res.items as SPL[];
    console.error(res);
    return null;
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const getPlaylistTracks = async (id: string, tokenValue: string) => {
    let allTracks: any[] = [];
    let nextUrl = `/playlists/${id}/tracks`;

    while (nextUrl) {
      const res = await spotifyApi(nextUrl, tokenValue);
      if (!res) break;
      allTracks = allTracks.concat(res.items.map((row) => row.track));
      nextUrl = res.next;
      if (nextUrl) {
        nextUrl = nextUrl.replace('https://api.spotify.com/v1', '');
        await delay(500);
      }
    }
    return allTracks;
  };

  return {
    loggedin,
    token,
    href,
    clearToken,
    spotifyApi,
    getUsersPlaylists,
    getPlaylistTracks,
  };
}

export function exportTracksToCsv(tracks: STrack[]): string {
  const headers = ['Song Name', 'Artists', 'Album Name', 'Album Release Date'];
  const csvContent = [
    headers.join(';'),
    ...tracks.map((track) =>
      [
        track.name,
        track.artists.map((artist) => artist.name).join(','),
        track.album.name,
        track.album.release_date,
      ].join(';'),
    ),
  ].join('\n');

  return csvContent;
}

export function downloadCsvFile(tracks: STrack[], filename: string = 'tracks.csv'): void {
  const csvContent = exportTracksToCsv(tracks);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
