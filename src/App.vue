<script setup lang="ts">
import { ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal from './Tidal.vue';
import { getIRCS, searchTrack, type TTrack } from './tidal';
import type { STrack } from './useSpotify';

const sexports = ref<STrack[]>([]);
const imports = ref([]);
const existing = ref<TTrack[]>([]);

const expo = async (track: STrack) => {
  const name = track.name;
  const artist = track.artists.map((art) => art.name);
  // const album = track.album.name;
  // const year = track.album.release_date.split('-')[0];
  const query = [name, artist].flat().join(' ');
  // console.log('EXP', { query });
  console.log(track);

  const res = await searchTrack(query);
};

const all = async () => {
  const isrcs = sexports.value.map((tr: STrack) => tr.external_ids.isrc);
  //  make set
  console.log('SPO', isrcs);
  const res = await getIRCS(isrcs);
  const tidal = res.data?.data;
  console.log('TID', tidal);
};

// function trackInExisting(track: STrack) {
//   return existing.value.some((existingTrack) => {
//     return (
//       existingTrack.attributes?.title === track.name // existingTrack.attributes.title === track.artists.map((art) => art.name).join(' ')
//     );
//   });
// }

const loadExports = (list: STrack[]) => {
  sexports.value = list;
};

const loadedExisting = (tracks: TTrack[]) => {
  existing.value = tracks;
};
</script>

<template>
  <header>
    <span>Spotify playlist exporteur international</span>
  </header>

  <div class="grid grid-cols-2">
    <div>
      <h2 class="text-center text-3xl font-bold">Spotify</h2>
      <div class="border border-gray-400 rounded-md p-2">
        <Spotify @exports="loadExports">
          <p>spotify loaded PL</p>
          <p>{{ sexports.length }} tracks</p>
          <button @click="all" class="bg-blue-300">expo all</button>
          <ul class="my-8">
            <li v-for="tr in sexports" :key="tr.id">
              <button @click="expo(tr)">
                {{ tr.name }} - {{ tr.artists?.map((a) => a.name).join(', ') }} [{{ tr.external_ids.isrc }}]
              </button>
            </li>
          </ul>
        </Spotify>
      </div>
    </div>
    <div>
      <h2 class="text-center text-3xl font-bold">Tidal</h2>
      <div class="border border-gray-400 rounded-md p-2">
        <Tidal @pl-tracks="loadedExisting">
          <p>currently has {{ existing.length }} tracks</p>
          <ul class="my-4">
            <li v-for="tr in existing" :key="tr.id">
              {{ tr.attributes?.title }}
            </li>
          </ul>
        </Tidal>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
