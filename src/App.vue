<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  addTracksStaggered,
  findISRCStaggered,
  type TTrack,
  type TPL,
  searchTrack,
  useTidal,
  getPlaylistTracks,
} from './tidal';
import { useSpotify, type SPL, type STrack } from './useSpotify';

const sexports = ref<STrack[]>([]);
const imports = ref<{
  isrc?: number;
  total?: number;
  existing?: number;
  notFound?: number;
  isrcAdded?: boolean;
}>({});

const spotify = useSpotify();
const tidal = useTidal();

const existing = ref<TTrack[]>([]);
const selectedTidalPlaylist = ref<TPL | null>(null);

const loggedin = computed(() => {
  return spotify.loggedin.value && tidal.loggedin.value;
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

const exportPl = () => {
  // console.log(' exp ', spotify.tracks.value);
  // console.log('imp ', tidal.tracks.value);

  const isrcs = spotify.tracks.value.map((tr) => tr.external_ids.isrc);
  console.log(' exp isrcs ', isrcs.length);

  console.log(' existing ', tidal.tracks.value);
};

const runexport = async () => {
  if (!selectedTidalPlaylist.value) return;

  // filter export items already in existing
  const existingIsrcs = existing.value.map((tr) => tr.attributes?.isrc);
  const filterExisting = sexports.value.filter((tr) => !existingIsrcs.includes(tr.external_ids.isrc));
  imports.value = {
    total: sexports.value.length,
    existing: sexports.value.length - filterExisting.length,
  };

  //  find by ISRC
  const isrcIds = filterExisting.map((tr: STrack) => tr.external_ids.isrc);
  const foundIsrcs = await findISRCStaggered(isrcIds);

  // filter tracks that werent found by isrcs
  const notFound = filterExisting.filter(
    (tr: STrack) => !foundIsrcs.some((is) => is.attributes?.isrc === tr.external_ids.isrc),
  );
  imports.value = {
    ...imports.value,
    isrc: foundIsrcs.length,
    notFound: notFound.length,
  };

  console.log('not found by ISRC ', notFound.length, notFound);

  // write to playlist
  const ids = foundIsrcs.map((tr) => tr.id);
  const resp = await addTracksStaggered(selectedTidalPlaylist.value.id, ids);
  console.log('added tracks to PL');
  imports.value = {
    ...imports.value,
    isrcAdded: true,
  };

  // const nada = [];
  // for (let i = 0; i < notFound.length; i++) {
  //   const tr = notFound[i];
  //   const q = [tr?.name, tr?.artists.map((a) => a.name)].flat().join(' ');

  //   const resp = await searchTrack(q);
  //   console.log(resp);

  //   if (resp?.length === 0) {
  //     nada.push(tr);
  //   }
  //   // search
  //   // chose from search results
  //   // if no search results add to nada
  // }
};
</script>

<template>
  <header>
    <span>Spotify playlist exporteur international</span>
  </header>
  <p></p>

  <main class="max-w-[600px] mx-auto space-y-2">
    <div class="x">
      <h2 class="h2 step">1. login</h2>
      <p v-if="!loggedin">
        Questions before you give access? read
        <a href="#faq">FAQ</a>
      </p>

      <div v-if="!spotify.loggedin.value">
        <h3 class="h3">connect spotify</h3>
        <p>please login spotify</p>
        <a :href="spotify.href">login</a>
      </div>
      <div v-else>
        <!-- spotify logout? -->
      </div>
      <div v-if="!tidal.loggedin.value">
        <h3 class="h3">connect tidal</h3>
        <button @click="tidal.login">login</button>
      </div>
      <div v-else>
        <!-- logout tidal -->
      </div>
    </div>

    <div v-if="loggedin">
      <h2 class="h2 step">2. select playlist</h2>

      <!-- Select spotify -->
      <div class="x my-4">
        <div v-if="!spotify.selected.value">
          <h3 class="h3">select spotify playlist to export</h3>
          <ul class="my-4">
            <li v-for="pl in spotify.playlists.value">
              {{ pl.name }}
              <span class="x text-sm text-gray-400"> {{ pl.tracks.total }} tracks </span>
              <button class="button sm" @click="selectSpotifyPl(pl)">select</button>
            </li>
          </ul>
        </div>
        <div v-else>
          <h3 class="h3">Exporting spotify :</h3>
          <p class="flex gap-4">
            {{ spotify.selected.value.name }}
            <span class="text-sm text-gray-400">{{ spotify.selected.value.tracks.total }} tracks</span>
            <button class="button sm text-sm" @click="spotifyUnselect">change</button>
          </p>
        </div>
      </div>

      <!-- select Tidal -->
      <div class="x">
        <div v-if="!tidal.selected.value">
          <h3 class="h3">select tidal Playlist to import to</h3>
          <ul>
            <li v-for="pl in tidal.playlists.value" class="flex gap-2">
              "{{ pl.attributes?.name }}"
              <span class="x text-gray-400 text-sm">{{ pl.attributes?.numberOfItems }} tracks</span>
              <button class="button sm" @click="selectTidal(pl)">select</button>
            </li>
          </ul>
        </div>
        <div v-else>
          <h3 class="h3">importing Tidal :</h3>
          <p class="x">
            "{{ tidal.selected.value.attributes?.name }}"
            <span class="x text-sm text-gray-400"> {{ tidal.selected.value.attributes?.numberOfItems }} tracks </span>
            <button class="button sm text-sm" @click="tidalUnselect">change</button>
          </p>
        </div>
        <button class="button" @click="exportPl">Export</button>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
