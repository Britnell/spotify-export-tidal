<script setup lang="ts">
import { computed, ref } from 'vue';
import { addTracksStaggered, findISRCStaggered, type TPL, useTidal, getPlaylistTracks } from './tidal';
import { useSpotify, type SPL, type STrack } from './useSpotify';

const spotify = useSpotify();
const tidal = useTidal();
const log = ref<string[]>([]);
const notFoundExports = ref<STrack[]>([]);
const newname = ref('');

const loggedin = computed(() => {
  return spotify.loggedin.value && tidal.loggedin.value;
});

const selectSpotifyPl = async (pl: SPL) => {
  spotify.selected.value = pl;

  const tracks = await spotify.getPlaylistTracks(pl.id, spotify.token.value);
  spotify.tracks.value = tracks;

  log.value = [...log.value, `Exporting spotify playlist with ${tracks.length} tracks`];
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
  log.value = [...log.value, `target Tidal playlist currently has ${tracks.length} tracks `, 'ready'];
};

const tidalUnselect = () => {
  tidal.selected.value = null;
  tidal.tracks.value = [];
};

const createnew = () => {
  const name = newname.value;
  console.log({ name });
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

  // console.log(' exp isrcs ', isrcs.length);
  // console.log(' imp exist isrcs ', existing.length);
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
          <ul class="my-4 max-h-[75vh] overflow-auto">
            <li v-for="pl in spotify.playlists.value" :key="pl.id">
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
            <button class="button sm" @click="spotifyUnselect">change</button>
          </p>
        </div>
      </div>

      <!-- select Tidal -->
      <div class="x my-4" v-if="spotify.selected.value">
        <div v-if="!tidal.selected.value">
          <h3 class="h3">select tidal Playlist to import to</h3>
          <ul>
            <li v-for="pl in tidal.playlists.value" :key="pl.id" class="flex gap-2">
              "{{ pl.attributes?.name }}"
              <span class="x text-gray-400 text-sm">{{ pl.attributes?.numberOfItems }} tracks</span>
              <button class="button sm" @click="selectTidal(pl)">select</button>
            </li>
          </ul>
          <h4 class="h4">or create new</h4>
          <div class="x">
            <label for="newname">Name</label>
            <input id="newname" v-model="newname" class="border p-1" />
            <button @click="createnew">create</button>
          </div>
        </div>
        <div v-else>
          <h3 class="h3">importing Tidal :</h3>
          <p class="x">
            "{{ tidal.selected.value.attributes?.name }}"
            <span class="x text-sm text-gray-400"> {{ tidal.selected.value.attributes?.numberOfItems }} tracks </span>
            <button class="button sm" @click="tidalUnselect">change</button>
          </p>
        </div>
      </div>

      <!-- export ! -->
      <div v-if="tidal.selected.value && spotify.selected.value" class="my-8">
        <button class="button bg-blue-400" @click="exportPl">Start Export</button>

        <h3 class="h3 mt-4">Log</h3>
        <ul class="font-mono p-1 bg-gray-100">
          <li v-for="line in log" :key="line">
            {{ line }}
          </li>
        </ul>

        <div class="my-8" v-if="notFoundExports.length > 0">
          <detail>
            <summary>
              <h4>tracks not found:</h4>
            </summary>
            <ul class="x">
              <li v-for="tr in notFoundExports" class="my-2" :key="tr.id">
                <span class="x"> {{ tr.name }} {{ tr.artists.map((a) => a.name).join(', ') }}{{ tr.album.name }}</span>
                <span class="ml-4 text-sm text-gray-500">{{ tr.album.release_date }}</span>
              </li>
            </ul>
          </detail>
          <button>download as csv</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
