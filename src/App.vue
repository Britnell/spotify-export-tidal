<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { onMounted, ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal from './Tidal.vue';
import type { Track } from './spotify';

const migr = (track: Track) => {
  console.log('EXP', track);
};
</script>

<template>
  <header>
    <span>Spotify playlist exporteur international</span>
  </header>

  <div class="grid grid-cols-2">
    <div class="border border-gray-400 rounded-md p-2">
      <Spotify @migrate="migr" />
    </div>
    <div class="border border-gray-400 rounded-md p-2">
      <Tidal />
    </div>
  </div>
</template>

<style scoped></style>
