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

  const getPlaylists = async (tokenValue: string) => {
    const res = await spotifyApi('/me/playlists', tokenValue);
    if (res?.items) return res.items as SPL[];
    console.error(res);
    return null;
  };

  const getTracks = async (id: string, tokenValue: string) => {
    const res = await spotifyApi(`/playlists/${id}/tracks`, tokenValue);
    console.log(res);
    return res?.items.map((row) => row.track);
  };

  return {
    loggedin,
    token,
    href,
    clearToken,
    spotifyApi,
    getPlaylists,
    getTracks,
  };
}
