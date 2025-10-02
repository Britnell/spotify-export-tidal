import {
  init,
  initializeLogin,
  finalizeLogin,
  logout,
  credentialsProvider,
} from '../tidal-sdk-web/packages/auth/src/index';
import { createAPIClient } from '../tidal-sdk-web/packages/api/dist/index';

export type TTrack = {
  id: string;
  type: string;
  attributes?: {
    title?: string;
    isrc?: string;
    [key: string]: any;
  };
  relationships?: {
    albums?: any;
    artists?: any;
    [other: string]: any;
  };
};

export type TPL = {
  type: string;
  id: string;
  attributes?: {
    name: string;
    numberOfItems?: number;
  };
};

const CLIENT_ID = 'GIcepHVXA3SP67Yi';

let countryCode = 'DE';

async function initSdk() {
  await init({
    clientId: CLIENT_ID,
    credentialsStorageKey: 'authorizationCode',
    scopes: ['user.read', 'playlists.read'],
  });
}

export async function login() {
  await initSdk();

  const loginUrl = await initializeLogin({
    redirectUri: 'http://localhost:5173/',
  });

  window.open(loginUrl, '_self');
}

export async function handleRedirect() {
  if (window.location.search.length > 0) {
    await initSdk();
    await finalizeLogin(window.location.search);
    window.location.replace('/');
  }
}

export function doLogout() {
  logout();
  window.location.reload();
}

export async function getDecodedToken() {
  await initSdk();
  const credentials = await credentialsProvider.getCredentials();
  return credentials.token;
}

const apiClient = createAPIClient(credentialsProvider);

export const getUser = () =>
  apiClient.GET('/users/me').then((res) => {
    countryCode = res.data?.data.attributes?.country || 'DE';
    return res.data?.data;
  });

export const getUserPlaylists = (uid: string) =>
  apiClient.GET('/playlists', {
    params: {
      // path: { id: uid },
      query: {
        countryCode,
        // include: [],
        'filter[owners.id]': [uid],
      },
    },
  });

export const searchTrack = async (searchTerm: string) => {
  const search = await apiClient.GET('/searchResults/{id}', {
    params: {
      path: { id: searchTerm },
      query: {
        countryCode,
        explicitFilter: 'include',
        include: ['tracks'],
      },
    },
  });

  // const ids = search.

  if (!search.data?.included) {
    console.log(' nada?');
    return [];
  }
  const ids = search.data?.included.map((tr) => tr.id);
  console.log(ids);

  // return apiClient.GET('/tracks',{
  //   params: {
  //     query: {

  //     }
  //   }
  // })
};
// .then((res) => res.data?.included);

export const getIRCS = (ids: string[]) => {
  return apiClient.GET('/tracks', {
    params: {
      query: {
        countryCode,
        includes: ['albums', 'artists'],
        'filter[isrc]': ids,
      },
    },
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches tracks from Tidal by their ISRCs in staggered chunks.
 * The Tidal API limits fetching tracks by ISRC to 20 per request.
 * This function handles chunking and makes sequential requests.
 *
 * @param isrcs - An array of ISRC strings.
 * @param interval - The delay in milliseconds between each chunk request (default: 100).
 * @returns A promise that resolves to an array of all fetched tracks.
 */
export async function getISRCStaggered(isrcs: string[], interval: number = 100): Promise<TTrack[]> {
  const chunkSize = 20;
  const chunks: string[][] = [];

  for (let i = 0; i < isrcs.length; i += chunkSize) {
    chunks.push(isrcs.slice(i, i + chunkSize));
  }

  let allTracks: TTrack[] = [];

  for (const chunk of chunks) {
    try {
      const response = await getIRCS(chunk);
      const tracks: TTrack[] = response.data?.data || [];

      allTracks = allTracks.concat(tracks);

      if (interval > 0 && chunks.length > 1) {
        await delay(interval);
      }
    } catch (error) {
      console.error('Error fetching a chunk of tracks by ISRC:', error);
      throw error;
    }
  }
  return allTracks;
}

export const getPlaylist = (id: string) =>
  apiClient.GET('/playlists/{id}/relationships/items', {
    params: {
      path: {
        id,
      },
      query: {
        include: ['items'],
        countryCode,
      },
    },
  });

export const _pl = [
  {
    id: '02cb6e55-b77c-465b-ad03-0ea132b7f01b',
    type: 'playlists',
    attributes: {
      name: 'Fruit loops',
      description: '',
      bounded: true,
      duration: 'PT32M43S',
      numberOfItems: 7,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-09-14T20:09:49.156Z',
      lastModifiedAt: '2025-09-25T19:19:12.646Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: 'b0cfbe89-f66d-4747-ab32-8dcba78c752c',
    type: 'playlists',
    attributes: {
      name: '📻 Radio Earth  🌍 ',
      description:
        'This playlist was created by https://www.tunemymusic.com that lets you transfer your playlist to Tidal from any music platform such as Spotify, YouTube, Apple Music etc.',
      bounded: true,
      duration: 'PT34H18M37S',
      numberOfItems: 486,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/b0cfbe89-f66d-4747-ab32-8dcba78c752c',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/b0cfbe89-f66d-4747-ab32-8dcba78c752c?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/b0cfbe89-f66d-4747-ab32-8dcba78c752c?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/b0cfbe89-f66d-4747-ab32-8dcba78c752c?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-22T19:19:43.595Z',
      lastModifiedAt: '2025-09-16T14:10:53.938Z',
      accessType: 'PUBLIC',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/b0cfbe89-f66d-4747-ab32-8dcba78c752c/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/b0cfbe89-f66d-4747-ab32-8dcba78c752c/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/b0cfbe89-f66d-4747-ab32-8dcba78c752c/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: '4666944f-9e66-4df1-b670-140e9b181dee',
    type: 'playlists',
    attributes: {
      name: 'No Reason',
      description:
        'This playlist was created by https://www.tunemymusic.com that lets you transfer your playlist to Tidal from any music platform such as Spotify, YouTube, Apple Music etc.',
      bounded: true,
      duration: 'PT5H6M32S',
      numberOfItems: 72,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/4666944f-9e66-4df1-b670-140e9b181dee',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/4666944f-9e66-4df1-b670-140e9b181dee?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/4666944f-9e66-4df1-b670-140e9b181dee?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/4666944f-9e66-4df1-b670-140e9b181dee?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-22T19:14:36.920Z',
      lastModifiedAt: '2025-07-22T19:14:37.852Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/4666944f-9e66-4df1-b670-140e9b181dee/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/4666944f-9e66-4df1-b670-140e9b181dee/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/4666944f-9e66-4df1-b670-140e9b181dee/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: '6c783766-15d5-4075-a2df-c118d4c011a5',
    type: 'playlists',
    attributes: {
      name: 'FEEEELS 🧠',
      description:
        'This playlist was created by https://www.tunemymusic.com that lets you transfer your playlist to Tidal from any music platform such as Spotify, YouTube, Apple Music etc.',
      bounded: true,
      duration: 'PT12H8M7S',
      numberOfItems: 168,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/6c783766-15d5-4075-a2df-c118d4c011a5',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/6c783766-15d5-4075-a2df-c118d4c011a5?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/6c783766-15d5-4075-a2df-c118d4c011a5?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/6c783766-15d5-4075-a2df-c118d4c011a5?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-22T19:10:26.944Z',
      lastModifiedAt: '2025-09-25T19:26:49.934Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/6c783766-15d5-4075-a2df-c118d4c011a5/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/6c783766-15d5-4075-a2df-c118d4c011a5/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/6c783766-15d5-4075-a2df-c118d4c011a5/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: '7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7',
    type: 'playlists',
    attributes: {
      name: '💿 SHELF',
      description:
        'This playlist was created by https://www.tunemymusic.com that lets you transfer your playlist to Tidal from any music platform such as Spotify, YouTube, Apple Music etc.',
      bounded: true,
      duration: 'PT5H19M56S',
      numberOfItems: 78,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-22T19:09:52.160Z',
      lastModifiedAt: '2025-07-22T19:43:51.778Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/7f1afb1d-d683-4d53-9dc6-1d7e07ea10d7/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: '70c90500-d7bc-4ec0-b1cd-e85acca44557',
    type: 'playlists',
    attributes: {
      name: 'Coconut 🥥',
      description:
        'This playlist was created by https://www.tunemymusic.com that lets you transfer your playlist to Tidal from any music platform such as Spotify, YouTube, Apple Music etc.',
      bounded: true,
      duration: 'PT8H14M52S',
      numberOfItems: 125,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/70c90500-d7bc-4ec0-b1cd-e85acca44557',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/70c90500-d7bc-4ec0-b1cd-e85acca44557?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/70c90500-d7bc-4ec0-b1cd-e85acca44557?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/70c90500-d7bc-4ec0-b1cd-e85acca44557?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-22T19:06:44.224Z',
      lastModifiedAt: '2025-07-22T19:06:47.761Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/70c90500-d7bc-4ec0-b1cd-e85acca44557/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/70c90500-d7bc-4ec0-b1cd-e85acca44557/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/70c90500-d7bc-4ec0-b1cd-e85acca44557/relationships/items?countryCode=DE',
        },
      },
    },
  },
  {
    id: '0d80d486-a9f3-49aa-bbbb-6c1f315abcd6',
    type: 'playlists',
    attributes: {
      name: 'Metta',
      description: '',
      bounded: true,
      duration: 'PT3M37S',
      numberOfItems: 1,
      externalLinks: [
        {
          href: 'https://listen.tidal.com/playlist/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
        {
          href: 'https://tidal.com/playlist/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_ANDROID',
          },
        },
        {
          href: 'https://tidal.com/playlist/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_IOS',
          },
        },
        {
          href: 'https://listen.tidal.com/playlist/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6?play=true',
          meta: {
            type: 'TIDAL_AUTOPLAY_WEB',
          },
        },
      ],
      createdAt: '2025-07-18T15:47:40.269Z',
      lastModifiedAt: '2025-07-18T15:47:40.492Z',
      accessType: 'UNLISTED',
      playlistType: 'USER',
    },
    relationships: {
      owners: {
        links: {
          self: '/playlists/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6/relationships/owners?countryCode=DE',
        },
      },
      coverArt: {
        links: {
          self: '/playlists/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6/relationships/coverArt?countryCode=DE',
        },
      },
      items: {
        links: {
          self: '/playlists/0d80d486-a9f3-49aa-bbbb-6c1f315abcd6/relationships/items?countryCode=DE',
        },
      },
    },
  },
];

export const _sel = {
  id: '02cb6e55-b77c-465b-ad03-0ea132b7f01b',
  type: 'playlists',
  attributes: {
    name: 'Fruit loops',
    description: '',
    bounded: true,
    duration: 'PT32M43S',
    numberOfItems: 7,
    externalLinks: [
      {
        href: 'https://listen.tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b',
        meta: {
          type: 'TIDAL_SHARING',
        },
      },
      {
        href: 'https://tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
        meta: {
          type: 'TIDAL_AUTOPLAY_ANDROID',
        },
      },
      {
        href: 'https://tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
        meta: {
          type: 'TIDAL_AUTOPLAY_IOS',
        },
      },
      {
        href: 'https://listen.tidal.com/playlist/02cb6e55-b77c-465b-ad03-0ea132b7f01b?play=true',
        meta: {
          type: 'TIDAL_AUTOPLAY_WEB',
        },
      },
    ],
    createdAt: '2025-09-14T20:09:49.156Z',
    lastModifiedAt: '2025-09-25T19:19:12.646Z',
    accessType: 'UNLISTED',
    playlistType: 'USER',
  },
  relationships: {
    owners: {
      links: {
        self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/owners?countryCode=DE',
      },
    },
    coverArt: {
      links: {
        self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/coverArt?countryCode=DE',
      },
    },
    items: {
      links: {
        self: '/playlists/02cb6e55-b77c-465b-ad03-0ea132b7f01b/relationships/items?countryCode=DE',
      },
    },
  },
};

export const _tracks = [
  {
    id: '206716349',
    type: 'tracks',
    attributes: {
      title: 'Sora Wo Tobetara',
      version: null,
      isrc: 'JPBV09401584',
      duration: 'PT3M42S',
      copyright: {
        text: '(P) 1978 Sony Music Labels Inc.',
      },
      explicit: false,
      popularity: 0.458579289936431,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['HIRES_LOSSLESS', 'LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/206716349',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
      createdAt: '2021-11-26T05:00:32Z',
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/206716349/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/206716349/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/206716349/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/206716349/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/206716349/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/206716349/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/206716349/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/206716349/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/206716349/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/206716349/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/206716349/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '197558045',
    type: 'tracks',
    attributes: {
      title: 'Gonna Be',
      version: null,
      isrc: 'UKX9R2100009',
      duration: 'PT4M11S',
      copyright: {
        text: 'Carrying Colour',
      },
      explicit: false,
      popularity: 0.25104222820660216,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/197558045',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
      createdAt: '2021-09-14T00:32:36Z',
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/197558045/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/197558045/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/197558045/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/197558045/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/197558045/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/197558045/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/197558045/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/197558045/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/197558045/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/197558045/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/197558045/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '1569049',
    type: 'tracks',
    attributes: {
      title: 'Ye Meera Divanapan Hai',
      version: null,
      isrc: 'USNA10320051',
      duration: 'PT3M33S',
      copyright: {
        text: '℗ 2003 Narada Productions, Inc.',
      },
      explicit: false,
      popularity: 0.16399285228392263,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/1569049',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/1569049/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/1569049/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/1569049/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/1569049/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/1569049/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/1569049/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/1569049/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/1569049/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/1569049/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/1569049/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/1569049/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '24382892',
    type: 'tracks',
    attributes: {
      title: "The Sorcerer's Apprentice",
      version: null,
      isrc: 'USWD10322065',
      duration: 'PT9M37S',
      copyright: {
        text: '℗ 1999 Walt Disney Records',
      },
      explicit: false,
      popularity: 0.5055065364084222,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/24382892',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/24382892/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/24382892/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/24382892/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/24382892/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/24382892/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/24382892/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/24382892/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/24382892/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/24382892/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/24382892/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/24382892/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '332595043',
    type: 'tracks',
    attributes: {
      title: 'Calypso Minor',
      version: null,
      isrc: 'DEF301000001',
      duration: 'PT6M21S',
      copyright: {
        text: '2011 Sunnyside Communications',
      },
      explicit: false,
      popularity: 0.4801077298456522,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/332595043',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/332595043/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/332595043/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/332595043/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/332595043/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/332595043/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/332595043/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/332595043/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/332595043/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/332595043/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/332595043/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/332595043/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '4076700',
    type: 'tracks',
    attributes: {
      title: 'How Long?',
      version: null,
      isrc: 'USWB10001716',
      duration: 'PT3M6S',
      copyright: {
        text: '℗ 1987 Warner Records Inc.',
      },
      explicit: false,
      popularity: 0.15915789579421624,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/4076700',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/4076700/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/4076700/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/4076700/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/4076700/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/4076700/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/4076700/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/4076700/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/4076700/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/4076700/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/4076700/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/4076700/relationships/radio?countryCode=DE',
        },
      },
    },
  },
  {
    id: '197558043',
    type: 'tracks',
    attributes: {
      title: 'Say',
      version: null,
      isrc: 'UKX9R2100007',
      duration: 'PT2M13S',
      copyright: {
        text: 'Carrying Colour',
      },
      explicit: false,
      popularity: 0.3310911198462894,
      accessType: 'PUBLIC',
      availability: ['STREAM', 'DJ'],
      mediaTags: ['LOSSLESS'],
      externalLinks: [
        {
          href: 'https://tidal.com/browse/track/197558043',
          meta: {
            type: 'TIDAL_SHARING',
          },
        },
      ],
      spotlighted: false,
      createdAt: '2021-09-14T00:32:36Z',
    },
    relationships: {
      shares: {
        links: {
          self: '/tracks/197558043/relationships/shares?countryCode=DE',
        },
      },
      albums: {
        links: {
          self: '/tracks/197558043/relationships/albums?countryCode=DE',
        },
      },
      trackStatistics: {
        links: {
          self: '/tracks/197558043/relationships/trackStatistics?countryCode=DE',
        },
      },
      artists: {
        links: {
          self: '/tracks/197558043/relationships/artists?countryCode=DE',
        },
      },
      genres: {
        links: {
          self: '/tracks/197558043/relationships/genres?countryCode=DE',
        },
      },
      similarTracks: {
        links: {
          self: '/tracks/197558043/relationships/similarTracks?countryCode=DE',
        },
      },
      owners: {
        links: {
          self: '/tracks/197558043/relationships/owners?countryCode=DE',
        },
      },
      lyrics: {
        links: {
          self: '/tracks/197558043/relationships/lyrics?countryCode=DE',
        },
      },
      sourceFile: {
        links: {
          self: '/tracks/197558043/relationships/sourceFile?countryCode=DE',
        },
      },
      providers: {
        links: {
          self: '/tracks/197558043/relationships/providers?countryCode=DE',
        },
      },
      radio: {
        links: {
          self: '/tracks/197558043/relationships/radio?countryCode=DE',
        },
      },
    },
  },
];
