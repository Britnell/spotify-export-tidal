import { computed, onMounted, ref, watch } from 'vue';
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
    version?: string;
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
const interval = 600;
let token = '';

const apiClient = createAPIClient(credentialsProvider);

export function useTidal() {
  const token = ref('');
  const loginUrl = ref('');
  const userid = ref('');
  const loggedin = computed(() => token.value && userid.value);
  const playlists = ref<TPL[]>([]);

  onMounted(async () => {
    await init({
      clientId: CLIENT_ID,
      credentialsStorageKey: 'authorizationCode',
      scopes: ['user.read', 'playlists.read', 'playlists.write'],
    });

    loginUrl.value = await initializeLogin({
      redirectUri: 'http://localhost:5173/',
    });

    await handleRedirect();

    const credentials = await credentialsProvider.getCredentials();

    token.value = credentials.token || '';
    userid.value = credentials.userId || '';

    if (token.value && userid.value) {
      const res = await getUserPlaylists(userid.value);
      if (res.data) {
        playlists.value = res.data?.data;
      }
    }
  });

  // watch(loggedin, async (val) => {
  //   //
  // });

  return {
    token,
    loggedin,
    loginUrl,
    doLogout,
    playlists,
  };
}

export async function handleRedirect() {
  if (window.location.search.length > 0) {
    await finalizeLogin(window.location.search);
    window.location.replace('/');
  }
}

export function doLogout() {
  logout();
  window.location.reload();
}

export const getUser = () =>
  apiClient.GET('/users/me').then((res) => {
    countryCode = res.data?.data.attributes?.country || 'DE';
    return res.data?.data;
  });

export const getUserPlaylists = (uid: string) =>
  apiClient.GET('/playlists', {
    params: {
      query: {
        countryCode,
        'filter[owners.id]': [uid],
      },
    },
  });

export const searchTrack = async (searchTerm: string) => {
  return apiClient.GET('/searchResults/{id}', {
    params: {
      path: { id: searchTerm },
      query: {
        countryCode,
        // explicitFilter: 'include,exclude',
        include: ['tracks'],
      },
    },
  });
};

export const getIRCS = (ids: string[]) => {
  return apiClient
    .GET('/tracks', {
      params: {
        query: {
          countryCode,
          include: ['albums', 'artists'],
          'filter[isrc]': ids,
        },
      },
    })
    .then((res) => res?.data?.data);
};

export const addTracks = (plid: string, trackids: string[]) => {
  return apiClient.POST('/playlists/{id}/relationships/items', {
    params: {
      path: { id: plid },
      query: {
        countryCode,
      },
    },
    body: {
      data: trackids.map((id) => ({
        id,
        type: 'tracks' as const,
      })),
    },
  });
};

export async function addTracksStaggered(plid: string, trackids: string[]): Promise<any[]> {
  return staggerReq(trackids, 20, async (chunk: string[]) => {
    const response = await addTracks(plid, chunk);
    return [response];
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function staggerReq<T, R>(
  items: T[],
  chunkSize: number,
  processChunk: (chunk: T[]) => Promise<R[] | undefined | void>,
): Promise<R[]> {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  let allResults: R[] = [];

  for (const chunk of chunks) {
    try {
      const result = await processChunk(chunk);
      if (result && Array.isArray(result)) {
        allResults = allResults.concat(result);
      }
    } catch (error) {
      console.error('Error processing chunk:', error);
      // Continue processing other chunks
    }
    await delay(interval);
  }

  return allResults;
}

export async function findISRCStaggered(isrcs: string[]): Promise<TTrack[]> {
  return staggerReq(isrcs, 20, async (chunk: string[]) => {
    const resp = await getIRCS(chunk);
    if (!resp) throw new Error('no response');
    return resp;
  });
}

export const getPlaylistTracks = async (pl: TPL) => {
  return await getPlaylistTrackIds(pl.id);
};

// const getTracks = async (ids:string[])=>{
// const tracks = await apiClient.GET('/tracks', {
//   params: {
//     query: {
//       countryCode,
//       include: ['albums', 'artists'],
//       'filter[id]': ids,
//     },
//   },
// });
// }

const getPlaylistTrackIds = async (id: string) => {
  let allTracks: TTrack[] = [];
  const first = await apiClient.GET('/playlists/{id}/relationships/items', {
    params: {
      path: { id },
      query: {
        include: ['items'],
        countryCode,
      },
    },
  });
  if (first.data?.data) {
    allTracks = first.data.data;
  }
  let next = first.data?.links?.next;
  while (next) {
    await delay(interval);
    const resp = await tidalApi(next);
    if (resp.data) {
      allTracks = allTracks.concat(resp.data);
    }
    next = resp.links?.next;
  }
  return allTracks;
};

const base = 'https://openapi.tidal.com/v2';

const tidalApi = async (path: string) => {
  if (!token) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(base + path, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Tidal API request failed: ${response.statusText}`);
  }
  return response.json();
};
