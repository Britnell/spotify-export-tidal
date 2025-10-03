<script setup lang="ts">
import { ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal from './Tidal.vue';
import { addTracksStaggered, findISRCStaggered, type TTrack, type TPL, searchTrack } from './tidal';
import type { STrack } from './useSpotify';

const sexports = ref<STrack[]>([]);
const imports = ref<{
  isrc?: number;
  total?: number;
  existing?: number;
  notFound?: number;
  isrcAdded?: boolean;
}>({});
const existing = ref<TTrack[]>([]);
const selectedTidalPlaylist = ref<TPL | null>(null);

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

const expotrack = async (tr: STrack) => {
  const artists = tr.artists?.map((a) => a.name).join(' ');
  const q = tr.name + ' ' + artists;
  console.log({ q });

  const resp = await searchTrack(q);
  console.log(resp);

  // console.log(resp);

  //
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
            <li v-for="tr in sexports" :key="tr.id" @click="expotrack(tr)">
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
          <details>
            <summary>{{ existing.length }} tracks on playlist</summary>
            <ul class="my-4">
              <li v-for="tr in existing" :key="tr.id">
                {{ tr.attributes?.title }}
              </li>
            </ul>
          </details>

          <div>
            <h3>Importing</h3>
            <ul>
              <li v-if="imports.total">{{ imports.total }} tracks being imported</li>
              <li v-if="imports.existing">{{ imports.existing }} tracks were already on playlist</li>
              <li v-if="imports.isrc">{{ imports.isrc }} tracks found by ISRC</li>
              <li v-if="imports.notFound">{{ imports.notFound }} not found</li>
            </ul>
          </div>
        </Tidal>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
