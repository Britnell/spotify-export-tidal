<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { _playlists, _selected, _tracks } from './dummy';
import { useSpotify, type SPL, type STrack } from './useSpotify';

const { loggedin, token, href, getPlaylists, getTracks } = useSpotify();

const playlists = ref<SPL[]>(_playlists); //_playlists);
const selected = ref<SPL | null>(null); //);
const tracks = ref<STrack[]>(_tracks); //);

const emit = defineEmits(['exports']);

onMounted(async () => {
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
  const resp = await getTracks(list.id, token.value);
  console.log(resp);

  if (resp) {
    tracks.value = resp;
    emit('exports', tracks.value);
  }
};

const unselect = () => {
  selected.value = null;
  tracks.value = [];
  emit('exports', []);
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
        <button @click="unselect">cancel</button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped></style>
