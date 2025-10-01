import {
  init,
  initializeLogin,
  finalizeLogin,
  logout,
  credentialsProvider,
} from '../tidal-sdk-web/packages/auth/src/index';
import { createAPIClient } from '../tidal-sdk-web/packages/api/dist/index';

const CLIENT_ID = 'GIcepHVXA3SP67Yi';

async function initSdk() {
  await init({
    clientId: CLIENT_ID,
    credentialsStorageKey: 'authorizationCode',
    scopes: ['user.read'],
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

function base64UrlDecode(base64Url: string) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );

  return JSON.parse(jsonPayload);
}

export async function getDecodedToken() {
  await initSdk();
  const credentials = await credentialsProvider.getCredentials();
  return credentials.token;
}

const apiClient = createAPIClient(credentialsProvider);

export const search = async (searchTerm: string) => {
  return apiClient.GET('/searchResults/{id}', {
    params: {
      path: { id: searchTerm },
      query: {
        countryCode: 'US',
        explicitFilter: 'include',
        include: ['tracks'],
      },
    },
  });
};
