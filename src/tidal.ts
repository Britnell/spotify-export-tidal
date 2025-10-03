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

async function initSdk() {
  await init({
    clientId: CLIENT_ID,
    credentialsStorageKey: 'authorizationCode',
    scopes: ['user.read', 'playlists.read', 'playlists.write'],
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

/**
 * Adds tracks to a Tidal playlist in staggered chunks.
 * The Tidal API limits adding tracks to 20 per request.
 * This function handles chunking and makes sequential requests with delays.
 *
 * @param plid - The playlist ID.
 * @param trackids - An array of track IDs to add.
 * @returns A promise that resolves when all tracks have been added.
 */
export async function addTracksStaggered(plid: string, trackids: string[]): Promise<any[]> {
  return staggerReq(trackids, 20, async (chunk: string[]) => {
    const response = await addTracks(plid, chunk);
    return [response]; // Return the API response as an array
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractCursorFromUrl(path: string) {
  try {
    const params = new URLSearchParams(path);
    const cursor = params.get('page[cursor]');
    if (cursor) return cursor;
  } catch {
    return;
  }
}

/**
 * A reusable function for handling staggered chunked API requests.
 * Takes an array of items, chunks them, and processes each chunk with a delay.
 *
 * @param items - Array of items to process
 * @param chunkSize - Size of each chunk (default: 20)
 * @param processChunk - Function that processes a chunk and returns a result or void
 * @returns Promise that resolves to an array of all results (empty if processChunk returns void)
 */
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

/**
 * Fetches tracks from Tidal by their ISRCs in staggered chunks.
 * The Tidal API limits fetching tracks by ISRC to 20 per request.
 * This function handles chunking and makes sequential requests.
 *
 * @param isrcs - An array of ISRC strings.
 * @returns A promise that resolves to an array of all fetched tracks.
 */
export async function findISRCStaggered(isrcs: string[]): Promise<TTrack[]> {
  return staggerReq(isrcs, 20, async (chunk: string[]) => {
    const resp = await getIRCS(chunk);
    if (!resp) throw new Error('no response');
    return resp;
  });
}

export const getPlaylistTracks = async (id: string) => {
  const resp = await apiClient.GET('/playlists/{id}/relationships/items', {
    params: {
      path: { id },
      query: {
        include: ['items'],
        countryCode,
      },
    },
  });
  return resp.data?.data;
};
export const getPlaylistTracksCursor = async (id: string) => {
  let allTracks: TTrack[] = [];
  let cursor: string | undefined;

  while (true) {
    const resp = await apiClient.GET('/playlists/{id}/relationships/items', {
      params: {
        path: { id },
        query: {
          include: ['items'],
          countryCode,
          'page[cursor]': cursor, //&& encodeURIComponent(cursor),
        },
      },
    });

    if (!resp.data?.data) break;

    allTracks = allTracks.concat(resp.data.data);
    const nextPath = resp.data?.links?.next;
    if (!nextPath) break;
    cursor = extractCursorFromUrl(nextPath);
    console.log({ nextPath });
    console.log({ cursor });
    if (!cursor) break;
    await delay(8000);
  }

  return allTracks;
};
