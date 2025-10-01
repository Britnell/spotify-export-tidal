<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { onMounted, ref } from 'vue';
import { _playlists, _selected, _tracks } from './dummy';
import { getPlaylists, getTracks, href, type PL, type Track } from './spotify';

const token = ref('');
const playlists = ref<PL[]>([]); //_playlists);
const selected = ref<PL | null>(null); //_selected);
const tracks = ref<Track[]>([]); //_tracks);

// https://tidal-music.github.io/tidal-api-reference/#/searchResults/get_searchResults__id_

onMounted(async () => {
  const url = new URLSearchParams(window.location.hash.slice(1));

  const token = url.get('access_token');
  const type = url.get('token_type');
  const expires = url.get('expires_in');

  console.log('token spot?', { token, type, expires }, token?.length === 206);

  return;

  // token.value = tok;
  // if (playlists.value) return;

  // const items = await getPlaylists(tok);
  // if (items) {
  //   playlists.value = items;
  // }
});

const selectList = async (list: PL) => {
  selected.value = list;
  tracks.value = await getTracks(list.id, token.value);
};
</script>

<template>
  <div v-if="!token">
    <h2>Spotify Login</h2>
    <p>please login spotify</p>

    <a :href="href">login</a>
  </div>

  <div v-else>
    <div v-if="!selected">
      <h2>select your playlist</h2>
      <ul>
        <li v-for="item in playlists" :key="item.id">
          <button @click="selectList(item)">
            <img :src="item.images[2]?.url" />
            {{ item.name }}
            - {{ item.tracks.total }}
          </button>
        </li>
        <!-- <p>token = {{ token }}</p> -->
      </ul>
    </div>
    <div v-else>
      <h2>selected :{{ selected.name }}</h2>

      <h3>tracks</h3>
      <ul>
        <li v-for="tr in tracks">
          <p class="bold">{{ tr.name }} by {{ tr.artists.map((ar) => ar.name).join(', ') }}</p>
          <p>{{ tr.album.name }} ({{ tr.album.release_date }})</p>
          <p>{{ (tr.duration_ms / 1000 / 60).toFixed(1) }} mins</p>
        </li>
      </ul>
      {{ console.log(tracks[0]) }}
    </div>
  </div>
  <!-- <HelloWorld msg="Vite + Vue" /> -->
</template>

<style scoped></style>
