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
};

export const getPlaylists = (token: string) =>
  spotifyApi('/me/playlists', token).then((res) => {
    if (res?.items) return res.items as SPL[];
    console.error(res);
    return null;
  });

export const spotifyApi = (path: string, token: string) =>
  fetch('https://api.spotify.com/v1' + path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => (res.ok ? res.json() : res.text()));

export const getTracks = (id: string, token: string) =>
  spotifyApi(`/playlists/${id}/tracks`, token).then((res) => {
    if (res?.items) {
      const tr: STrack[] = res.items.map((it: { track: STrack }) => it.track);
      return tr;
    }
    console.error(res);
    return res;
  });
