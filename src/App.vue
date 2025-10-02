<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal, { type TTrack } from './Tidal.vue';
import type { STrack } from './spotify';

const sexports = ref<STrack[]>([]);
const imports = ref([]);
const existing = ref<TTrack[]>([]);

const expo = (track: STrack) => {
  const name = track.name;
  const artist = track.artists.map((art) => art.name).join(' ');
  const album = track.album.name;
  const year = track.album.release_date.split('-')[0];

  const query = [name, artist, album, year].join(' ');
  console.log('EXP', { query });

  // check if already in playlist
  // search
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
          <ul class="my-8">
            <li v-for="tr in sexports" :key="tr.id">
              <button @click="expo(tr)">{{ tr.name }} - {{ tr.artists?.map((a) => a.name).join(', ') }}</button>
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
