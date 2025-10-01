<script setup lang="ts">
// import { useQuery } from '@tanstack/vue-query';
import { onMounted, ref } from 'vue';
import Spotify from './Spotify.vue';
import Tidal from './Tidal.vue';
</script>

<template>
  <header>
    <span>Spotify playlist exporteur international</span>
  </header>

  <div class="grid grid-cols-2">
    <div class="border border-gray-400 rounded-md p-2">
      <Spotify />
    </div>
    <div class="border border-gray-400 rounded-md p-2">
      <Tidal />
    </div>
  </div>
</template>

<style scoped></style>
