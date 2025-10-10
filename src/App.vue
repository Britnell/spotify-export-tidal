<script setup lang="ts">
import { computed, ref } from 'vue';
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
const showExport = ref(false);
const done = ref(false);

const loggedin = computed(() => {
  return spotify.loggedin.value && tidal.loggedin.value;
});

const initlog = () => {
  log.value = [`Exporting "${spotify.selected.value?.name}" playlist, ${spotify.tracks.value.length} tracks`];
  if (tidal.selected.value) {
    log.value.push(`loaded "${tidal.selected.value.attributes?.name}" , ${tidal.tracks.value.length} tracks`);
  }
};

const selectSpotifyPl = async (pl: SPL) => {
  spotify.selected.value = pl;
  newname.value = pl.name;
  initlog();

  const tracks = await spotify.getPlaylistTracks(pl.id, spotify.token.value);
  spotify.tracks.value = tracks;

  //
};

const spotifyUnselect = () => {
  spotify.selected.value = null;
  spotify.tracks.value = [];
};

const selectTidal = async (pl: TPL) => {
  initlog();
  showExport.value = false;
  tidal.selected.value = pl;
  log.value.push(`loading tidal playlist "${tidal.selected.value.attributes?.name}" ...`);

  const tracks = await getPlaylistTracks(pl.id);
  tidal.tracks.value = tracks;
  log.value.push(`loaded  , ${tidal.tracks.value.length} tracks`);
  showExport.value = true;
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
  showExport.value = false;
  notFoundExports.value = [];
  if (!tidal.selected.value) {
    return;
  }
  // console.log(' export ', exportlist);

  // * check for duplicates
  const exportlist = spotify.tracks.value;
  const existingIsrc = tidal.tracks.value.map((tr) => tr.attributes?.isrc?.toUpperCase());

  const withoutExisting = exportlist.filter((expo) => !existingIsrc.includes(expo.external_ids.isrc.toUpperCase()));
  if (withoutExisting.length === 0) {
    log.value.push(`all tracks already found on target playlist check your tidal playlist and try reloading`);
    return;
  }
  const duplicates = exportlist.length - withoutExisting.length;
  log.value.push(`skipping ${duplicates} tracks already on target playlist`);

  log.value.push(`importing ${withoutExisting.length} tracks`);

  // * find by isrc
  log.value.push(`searching for tracks by isrc... `);
  const isrcIds = withoutExisting.map((tr: STrack) => tr.external_ids.isrc.toUpperCase());
  const foundIsrcs = await findISRCStaggered(isrcIds);

  if (foundIsrcs.length > 0) {
    log.value.push(`Found ${foundIsrcs.length} matching tracks by isrc `);
    log.value.push(`adding tracks to playlist ... `);
    const ids = foundIsrcs.map((tr) => tr.id);
    await addTracksStaggered(tidal.selected.value.id, ids);
  } else {
    log.value.push(`no tracks found by isrc`);
  }

  const noIsrc = withoutExisting.filter(
    (tr: STrack) => !foundIsrcs.some((is) => is.attributes?.isrc === tr.external_ids.isrc),
  );

  log.value.push(`${noIsrc.length} tracks not found via isrc`);

  log.value.push(`searching manually ... `);

  let manualsearch = [];
  for (let x = 0; x < noIsrc.length; x++) {
    log.value.push(`searching for ${x} of ${noIsrc.length}`);
    const missing = noIsrc[x];
    if (missing) {
      const q = {
        name: missing.name,
        art: missing.artists.map((a) => a.name),
        alb: missing.album.name,
      };
      const sq = [q.name, q.art].flat().join(' ');
      console.log(q);
      const searchres = await searchTrack(sq);
      const list = parseSearchRes(searchres);
      if (list?.length) {
        console.log(list);
        manualsearch.push(list[0]);
        log.value.push(`added closest match `);
      } else {
        notFoundExports.value.push(missing);
        log.value.push(`track not found : ${q.name}, ${q.art.join(', ')} `);
      }
    }
  }

  if (manualsearch.length > 0) {
    log.value.push(`Found ${manualsearch.length} tracks with manual search `);
    const ids = manualsearch.map((it) => it?.id).filter((it) => it);
    await addTracksStaggered(tidal.selected.value.id, ids as string[]);
    log.value.push(`added tracks to playlist `);
  } else {
    log.value.push(`found no other tracks`);
  }
  log.value.push(`Done!`);
  done.value = true;
};

const startAgain = () => {
  tidal.selected.value = null;
  spotify.selected.value = null;
  done.value = false;
};

const downloadcsv = () => {
  const name = spotify.selected.value?.name;

  downloadCsvFile(notFoundExports.value, `${name}-missing tracks`);
};
</script>
<template>
  <header>
    <span class="text-xl">Spo-Ti-Export</span>
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
          <h3 class="h4">4. create new playlist</h3>
          <div class="px-3 flex items-center gap-2">
            <label for="newname">Name</label>
            <input id="newname" v-model="newname" class="border p-1" />
            <button class="button" @click="createnew">create</button>
          </div>
          <details>
            <summary>
              <h3 class="h4 inline">or select existing Playlist to import to</h3>
            </summary>
            <ul class="my-4 pl-4 max-h-[50vh] overflow-auto">
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
          </details>
        </div>
        <p v-else class="flex gap-4 items-center">
          <span> Importing: </span>
          "{{ tidal.selected.value.attributes?.name }}"
          <span class="x text-sm text-gray-400"> {{ tidal.selected.value.attributes?.numberOfItems }} tracks </span>
          <button class="button sm ml-auto mr-4" @click="tidalUnselect">change</button>
        </p>
      </div>
    </div>

    <div v-if="spotify.selected.value && tidal.selected.value">
      <h2 class="mt-8 h2 step">Export</h2>

      <div class="px-4 py-3">
        <!-- <h3 class="h3 mt-4">Log</h3> -->
        <ul class="font-mono p-1 bg-slate-700">
          <li v-for="line in log" :key="line">
            {{ line }}
          </li>
        </ul>
        <button v-if="showExport" class="button bg-blu-600 mt-2" @click="exportPl">Start Export</button>

        <button v-if="done" class="button bg-blu-600 mt-2" @click="startAgain">migrate another one</button>

        <div class="my-8" v-if="notFoundExports.length > 0">
          <h4 class="h4 inline">tracks not found:</h4>
          <ul class="x">
            <li v-for="tr in notFoundExports" class="my-2 flex gap-3" :key="tr.id">
              <span class="x"> {{ tr.name }} </span>
              <span> {{ tr.artists.map((a) => a.name).join(', ') }}</span>
              <span>
                {{ tr.album.name }}
              </span>
              <a
                :href="`https://tidal.com/search?q=${encodeURIComponent(
                  [tr.name, tr.artists.map((a) => a.name)].flat().join(' '),
                )}`"
                target="_blank"
                class="underline"
                >search</a
              >
            </li>
          </ul>
          <button class="button" @click="downloadcsv">download as csv</button>
        </div>
      </div>
    </div>
  </main>
</template>
