<script setup lang="ts">
import { ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal from './Tidal.vue';
import { getIRCS, getISRCStaggered, type TTrack, type TPL, _sel, addTracks } from './tidal';
import type { STrack } from './useSpotify';

const sexports = ref<STrack[]>([]);
const imports = ref([]);
const existing = ref<TTrack[]>([]);
const selectedTidalPlaylist = ref<TPL | null>(_sel);

const runexport = async () => {
  const exports = sexports.value;
  console.log(' export ', exports.length);

  //  find by ISRC
  const exp_isrcs = exports.map((tr: STrack) => tr.external_ids.isrc);
  const isrcs = await getISRCStaggered(exp_isrcs, 500);
  console.log(' found by ISRC ', isrcs.length, isrcs);

  // filter tracks that werent found by isrcs
  const notFoundIsrcs = exports.filter((tr: STrack) => {
    return !isrcs.some((is) => is.attributes?.isrc === tr.external_ids.isrc);
  });

  console.log('not found by ISRC ', notFoundIsrcs.length, notFoundIsrcs);
};

const expo = async (tr: STrack) => {
  const artists = tr.artists?.map((a) => a.name).join(' ');
  const q = tr.name + ' ' + artists;
  console.log(existing.value);

  // const resp = await searchTrack(q);
  // console.log(resp);

  //
};

const addtrack = async () => {
  //

  const pid = selectedTidalPlaylist.value?.id;
  if (pid) {
    const resp = await addTracks(pid, ['332595043']);
    console.log(resp);
  }
};
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
          <button @click="runexport" class="bg-blue-300">expo all</button>
          <ul class="my-8 list-disc pl-5">
            <li v-for="tr in sexports" :key="tr.id" @click="expo(tr)">
              {{ tr.name }} - {{ tr.artists?.map((a) => a.name).join(', ') }}
            </li>
          </ul>
        </Spotify>
      </div>
    </div>

    <div>
      <h2 class="text-center text-3xl font-bold">Tidal</h2>
      <div class="border border-gray-400 rounded-md p-2">
        <Tidal @pl-tracks="loadedExisting" v-model:selected="selectedTidalPlaylist">
          <p>currently has {{ existing.length }} tracks</p>
          <button class="x" @click="addtrack">add one</button>
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
