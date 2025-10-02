<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { onMounted, ref } from 'vue';
import { _playlists, _selected, _tracks } from './dummy';
import { getPlaylists, getTracks, href, type PL, type Track } from './spotify';

const token = ref('');
const playlists = ref<PL[]>(_playlists); //_playlists);
const selected = ref<PL | null>(_selected); //);
const tracks = ref<Track[]>(_tracks); //);

defineEmits(['migrate']);

onMounted(async () => {
  const url = new URLSearchParams(window.location.hash.slice(1));
  const urlToken = url.get('access_token');

  if (urlToken) {
    localStorage.setItem('spotify_token', urlToken);
    token.value = urlToken;
  } else {
    const storedToken = localStorage.getItem('spotify_token');
    if (storedToken) {
      token.value = storedToken;
    }
  }

  if (token.value && playlists.value.length == 0) {
    const items = await getPlaylists(token.value);
    if (items) {
      playlists.value = items;
    }
  }
});

const selectList = async (list: PL) => {
  selected.value = list;
  tracks.value = await getTracks(list.id, token.value);
};
</script>

<template>
  <h2>Spotify</h2>
  <div v-if="!token">
    <h3>Login</h3>
    <p>please login spotify</p>

    <a :href="href">login</a>
  </div>

  <div v-else>
    <div v-if="!selected">
      <h3>select your playlist</h3>
      <ul>
        <li v-for="item in playlists" :key="item.id">
          <button @click="selectList(item)">
            <img :src="item.images[2]?.url" />
            {{ item.name }}
            - {{ item.tracks.total }}
          </button>
        </li>
      </ul>
    </div>
    <div v-else>
      <h3>{{ selected.name }}</h3>
      <ul>
        <li v-for="tr in tracks" @click="$emit('migrate', tr)">
          <p class="bold">{{ tr.name }} by {{ tr.artists.map((ar) => ar.name).join(', ') }}</p>
          <p>{{ tr.album.name }} ({{ tr.album.release_date }})</p>
          <p>{{ (tr.duration_ms / 1000 / 60).toFixed(1) }} mins</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped></style>
