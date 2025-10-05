<script setup lang="ts">
import { effect, onMounted, ref, watch } from 'vue';
import { getPlaylistTracks, useTidal, type TPL, type TTrack } from './tidal';

defineProps<{
  selected: TPL | null;
}>();

const emit = defineEmits(['pl-tracks', 'update:selected']);

const { loggedin, loginUrl, doLogout, playlists } = useTidal();

const tracks = ref<TTrack[]>([]);
const newname = ref('');

watch(loggedin, () => {
  if (!loggedin.value) return;
  console.log('ll');
});

const choose = async (pl: TPL) => {
  emit('update:selected', pl);
  const res = await getPlaylistTracks(pl);
  tracks.value = res;
  emit('pl-tracks', tracks.value);
};

const create = () => {
  console.log(' create ', newname.value);
};
</script>

<template>
  <div v-if="!loggedin">
    <p>please login</p>
    <a :href="loginUrl">login</a>
  </div>
  <div v-else>
    <h2>choose playlist to export to</h2>
    <div v-if="!selected">
      <div class="my-8">
        <h3>create playlist</h3>
        <label for="newname">Name</label>
        <input v-model="newname" id="newname" name="newname" />
        <button @click="create">create</button>
      </div>

      <div>
        <h3 class="text-xl font-semibold">choose playlist</h3>
        <ul>
          <li v-for="pl in playlists" :key="pl.id" @click="choose(pl)">
            {{ pl.attributes?.name }}
            <span class="x text-sm ml-4 text-gray-400"> {{ pl.attributes?.numberOfItems }} tracks </span>
          </li>
        </ul>
      </div>

      <p>
        or
        <button @click="doLogout">logout</button>
      </p>
    </div>

    <!--  -->

    <div v-else>
      <div class="flex justify-between">
        <h3 class="text-xl font-semibold">{{ selected.attributes?.name }}</h3>
        <button @click="$emit('update:selected', null)">cancel</button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped></style>
