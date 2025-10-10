<script setup lang="ts">
import { ref } from 'vue';
import { _playlists, _selected, _tracks } from './dummy';
import { useSpotify, type SPL, type STrack } from './useSpotify';

const { loggedin, token, href, playlists, getPlaylistTracks } = useSpotify();

const selected = ref<SPL | null>(null); //);
const tracks = ref<STrack[]>(_tracks); //);

const emit = defineEmits(['exports']);

const selectList = async (list: SPL) => {
  selected.value = list;
  const resp = await getPlaylistTracks(list.id, token.value);
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
  <div v-if="!loggedin">
    <h3 class="text-xl font-semibold">Login</h3>
    <p>please login spotify</p>

    <a :href="href">login</a>
  </div>

  <div v-else>
    <div v-if="!selected">
      <h3 class="text-xl font-semibold">select your playlist to export</h3>
      <ul class="list-disc pl-5">
        <li v-for="item in playlists" :key="item.id">
          <button @click="selectList(item)" class="flex gap-3 py-1">
            {{ item.name }}
            <span class="x text-sm text-gray-500"> {{ item.tracks.total }} tracks </span>
          </button>
        </li>
      </ul>
    </div>
    <div v-else>
      <div class="flex justify-between">
        <h3 class="text-xl font-semibold">{{ selected.name }}</h3>
        <button @click="unselect">cancel</button>
      </div>
      <!-- <slot></slot> -->
    </div>
  </div>
</template>

<style scoped></style>
