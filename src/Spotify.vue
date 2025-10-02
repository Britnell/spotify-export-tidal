<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { onMounted, ref } from 'vue';
import { _playlists, _selected, _tracks } from './dummy';
import { getPlaylists, getTracks, href, type SPL, type STrack } from './spotify';

const token = ref('');
const playlists = ref<SPL[]>(_playlists); //_playlists);
const selected = ref<SPL | null>(_selected); //);
const tracks = ref<STrack[]>(_tracks); //);

const emit = defineEmits(['exports']);

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

  if (tracks.value) {
    emit('exports', tracks.value);
  }
});

const selectList = async (list: SPL) => {
  selected.value = list;
  tracks.value = await getTracks(list.id, token.value);
  emit('exports', tracks.value);
};
</script>

<template>
  <div v-if="!token">
    <h3 class="text-xl font-semibold">Login</h3>
    <p>please login spotify</p>

    <a :href="href">login</a>
  </div>

  <div v-else>
    <div v-if="!selected">
      <h3 class="text-xl font-semibold">select your playlist</h3>
      <ul>
        <li v-for="item in playlists" :key="item.id">
          <button @click="selectList(item)" class="flex gap-3 py-1">
            <!-- <img :src="item.images[2]?.url" /> -->
            {{ item.name }}
            - {{ item.tracks.total }}
          </button>
        </li>
      </ul>
    </div>
    <div v-else>
      <div class="flex justify-between">
        <h3 class="text-xl font-semibold">{{ selected.name }}</h3>
        <button @click="selected = null">cancel</button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped></style>
