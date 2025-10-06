<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  addTracksStaggered,
  findISRCStaggered,
  type TPL,
  useTidal,
  getPlaylistTracks,
  createPlaylist,
  searchTrack,
} from './tidal';
import { downloadCsvFile, useSpotify, type SPL, type STrack } from './useSpotify';
import { parseSearchRes } from './helper';

const spotify = useSpotify();
const tidal = useTidal();
const log = ref<string[]>([]);
const notFoundExports = ref<STrack[]>([]);
const newname = ref('');

const loggedin = computed(() => {
  return spotify.loggedin.value && tidal.loggedin.value;
});

onMounted(() => {
  // const s =
});
const selectSpotifyPl = async (pl: SPL) => {
  spotify.selected.value = pl;

  const tracks = await spotify.getPlaylistTracks(pl.id, spotify.token.value);
  spotify.tracks.value = tracks;

  //
};

const spotifyUnselect = () => {
  spotify.selected.value = null;
  spotify.tracks.value = [];
};

const selectTidal = async (pl: TPL) => {
  tidal.selected.value = pl;
  const tracks = await getPlaylistTracks(pl.id);
  tidal.tracks.value = tracks;
};

const tidalUnselect = () => {
  tidal.selected.value = null;
  tidal.tracks.value = [];
};

const createnew = async () => {
  const name = newname.value;
  const resp = await createPlaylist(name);
  const newpl = resp.data?.data;
  if (newpl) {
    newname.value = '';
    tidal.playlists.value = [...tidal.playlists.value, newpl];
    selectTidal(newpl);
  }
};

const exportPl = async () => {
  if (!tidal.selected.value) {
    return;
  }

  const exportlist = spotify.tracks.value;
  const existing = tidal.tracks.value;
  const existingIsrc = existing.map((tr) => tr.attributes?.isrc);

  // console.log(' export ', exportlist);
  // console.log(' import ', existing);

  const filterExisting = exportlist.filter((expo) => !existingIsrc.includes(expo.external_ids.isrc));

  const duplicates = exportlist.length - filterExisting.length;
  log.value = [...log.value, `skipped ${duplicates} tracks already on target playlist`];

  if (filterExisting.length === 0) {
    log.value = [...log.value, `they're already there. check your tidal playlist and try reloading`];
    return;
  }

  const isrcIds = filterExisting.map((tr: STrack) => tr.external_ids.isrc);
  const foundIsrcs = await findISRCStaggered(isrcIds);
  const notFound = filterExisting.filter(
    (tr: STrack) => !foundIsrcs.some((is) => is.attributes?.isrc === tr.external_ids.isrc),
  );
  notFoundExports.value = notFound;

  if (foundIsrcs.length > 0) {
    const ids = foundIsrcs.map((tr) => tr.id);
    await addTracksStaggered(tidal.selected.value.id, ids);
    log.value = [...log.value, `added ${foundIsrcs.length} tracks to target playlist `];
  } else {
    log.value = [...log.value, `no missing tracks found by isrc`];
  }

  log.value = [...log.value, `${notFound.length} tracks not found on tidal`];

  for (let x = 0; x < 2; x++) {
    const missing = notFound[x];
    if (missing) {
      const q = {
        name: missing.name,
        art: missing.artists.map((a) => a.name),
        alb: missing.album.name,
      };
      const sq = [q.name, q.art].flat().join(' ');
      const searchres = await searchTrack(sq);
      const list = parseSearchRes(searchres);
      console.log(list);
    }
  }
};

const downloadcsv = () => {
  const name = spotify.selected.value?.name;

  downloadCsvFile(notFoundExports.value, `${name}-missing tracks`);
};

watch(
  [tidal.tracks, spotify.tracks],
  () => {
    if (!tidal.selected.value || !spotify.selected.value) {
      return;
    }

    log.value = [
      `Exporting spotify playlist with ${spotify.tracks.value.length} tracks`,
      `target Tidal playlist currently has ${tidal.tracks.value.length} tracks `,
      'ready',
    ];
  },
  {
    deep: true,
  },
);
</script>

<template>
  <header>
    <span>Spotify playlist exporteur international</span>
  </header>
  <p></p>

  <main class="max-w-[600px] px-2 mx-auto">
    <div class="mt-10">
      <h2 class="h2 step mb-2">login</h2>
      <p v-if="!loggedin">
        Questions before you give access?
        <a href="/#faq" class="underline">read our FAQ</a>
      </p>
    </div>

    <div class="px-4 py-2" :class="loggedin ? 'space-y-2' : 'space-y-8'">
      <!-- Spotify login -->
      <div v-if="!spotify.loggedin.value">
        <h3 class="h4 flex gap-2">1. Connect your spotify account to export your playlists</h3>
        <a
          :href="spotify.href"
          class="mt-2 bg-spotify rounded-full px-3 py-1 text-black font-semibold block mx-auto w-min whitespace-nowrap"
        >
          login to spotify</a
        >
      </div>
      <div v-else class="grid grid-cols-2 place-items-start">
        <p class="">✅ Spotify connected</p>
        <button
          :href="spotify.href"
          class="button bg-spotify rounded-full text-black font-semibold"
          @click="spotify.clearToken"
        >
          logout spotify
        </button>
      </div>

      <!-- tidal login -->
      <div v-if="spotify.loggedin.value">
        <div v-if="!tidal.loggedin.value">
          <h3 class="h4">2. connect your tidal account you want to import playlists to</h3>
          <button
            class="mt-2 bg-black rounded-full px-3 py-1 border border-white block mx-auto w-min whitespace-nowrap"
            @click="tidal.login"
          >
            login to tidal
          </button>
        </div>
        <div v-else class="grid grid-cols-2 place-items-start">
          <p class="">✅ Tidal connected</p>
          <button :href="spotify.href" class="button bg-black rounded-full border border-white" @click="tidal.doLogout">
            logout tidal
          </button>
        </div>
      </div>
    </div>

    <h2 class="mt-8 h2 step">select playlist</h2>
    <div v-if="loggedin" class="px-4 py-2">
      <!-- Select spotify -->
      <div v-if="!spotify.selected.value">
        <h3 class="h4">3. select spotify playlist to export</h3>
        <ul class="my-4 max-h-[60vh] overflow-auto ml-4">
          <li
            v-for="pl in spotify.playlists.value"
            :key="pl.id"
            class="flex gap-3 rounded hover:bg-slate-800/60 px-1 py-0.5"
          >
            {{ pl.name }}
            <span class="x text-sm text-gray-400"> {{ pl.tracks.total }} tracks </span>
            <button class="button sm ml-auto mr-4" @click="selectSpotifyPl(pl)">select</button>
          </li>
        </ul>
      </div>

      <p v-else class="flex items-center gap-4">
        <span class="x">Exporting :</span>
        "{{ spotify.selected.value.name }}"
        <span class="text-sm text-gray-400">{{ spotify.selected.value.tracks.total }} tracks</span>
        <button class="button sm ml-auto mr-4" @click="spotifyUnselect">change</button>
      </p>

      <!-- select Tidal -->
      <div v-if="spotify.selected.value">
        <div class="mt-4" v-if="!tidal.selected.value">
          <h3 class="h4">4. select tidal Playlist to import to</h3>
          <ul class="my-4 pl-4 max-h-[60vh] overflow-auto">
            <li
              v-for="pl in [...tidal.playlists.value, ...tidal.playlists.value, ...tidal.playlists.value]"
              :key="pl.id"
              class="flex gap-2 items-center px-2 py-0.5 rounded hover:bg-slate-800/60"
            >
              "{{ pl.attributes?.name }}"
              <span class="x text-gray-400 text-sm">{{ pl.attributes?.numberOfItems }} tracks</span>
              <button class="ml-auto mr-2 button sm" @click="selectTidal(pl)">select</button>
            </li>
          </ul>
          <h3 class="h4">5. or create new one</h3>
          <div class="px-3 flex items-center gap-2">
            <label for="newname">Name</label>
            <input id="newname" v-model="newname" class="border p-1" />
            <button class="button" @click="createnew">create</button>
          </div>
        </div>
        <p v-else class="flex gap-4 items-center">
          <span> Importing: </span>
          "{{ tidal.selected.value.attributes?.name }}"
          <span class="x text-sm text-gray-400"> {{ tidal.selected.value.attributes?.numberOfItems }} tracks </span>
          <button class="button sm ml-auto mr-4" @click="tidalUnselect">change</button>
        </p>
      </div>

      <!-- export ! -->
      <div v-if="tidal.selected.value && spotify.selected.value" class="my-8">
        <h3 class="h3 mt-4">Log</h3>
        <ul class="font-mono p-1 bg-slate-700">
          <li v-for="line in log" :key="line">
            {{ line }}
          </li>
        </ul>
        <button class="button bg-blu-600 mt-2" @click="exportPl">Start Export</button>

        <div class="my-8" v-if="notFoundExports.length > 0">
          <details>
            <summary>
              <h4 class="h4 inline">tracks not found:</h4>
            </summary>
            <ul class="x">
              <li v-for="tr in notFoundExports" class="my-2" :key="tr.id">
                <span class="x"> {{ tr.name }} {{ tr.artists.map((a) => a.name).join(', ') }}{{ tr.album.name }}</span>
                <span class="ml-4 text-sm text-gray-500">{{ tr.album.release_date }}</span>
              </li>
            </ul>
          </details>
          <button class="button" @click="downloadcsv">download as csv</button>
        </div>
      </div>
    </div>
  </main>
</template>
