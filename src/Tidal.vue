<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  login,
  handleRedirect,
  getDecodedToken,
  getUser,
  getUserPlaylists,
  getPlaylistTracks,
  type TPL,
  type TTrack,
  doLogout,
  getPlaylistTracksCursor,
} from './tidal';

defineProps<{
  selected: TPL | null;
}>();

const token = ref(localStorage.getItem('authorizationCodeData'));
const userid = ref('204460008');
const playlists = ref<TPL[]>([]);
const tracks = ref<TTrack[]>([]);
const newname = ref('');

const emit = defineEmits(['pl-tracks', 'update:selected']);

onMounted(async () => {
  // * api init
  await handleRedirect();
  const stored = await getDecodedToken();
  if (!stored) return;
  token.value = stored;

  // * load user
  if (!userid.value) {
    const user = await getUser();
    if (!user) return;
    userid.value = user.id;
  }

  // load users' playlists
  if (playlists.value.length === 0) {
    const res = await getUserPlaylists(userid.value);
    if (res.data) {
      playlists.value = res.data?.data;
    }
  }
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
  <div v-if="!token">
    <p>please login</p>
    <button @click="login">login</button>
    <div v-if="token"></div>
  </div>
  <div v-else>
    <div v-if="!selected">
      <div class="my-8">
        <p>create playlist</p>
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
    </div>

    <!--  -->

    <div v-else>
      <div class="flex justify-between">
        <h3 class="text-xl font-semibold">{{ selected.attributes?.name }}</h3>
        <button @click="$emit('update:selected', null)">cancel</button>
      </div>
      <slot></slot>

      <p>
        or
        <button @click="doLogout">logout</button>
      </p>
    </div>
  </div>
</template>

<style scoped></style>
