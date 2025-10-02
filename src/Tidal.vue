<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  login,
  handleRedirect,
  getDecodedToken,
  searchTrack,
  getUser,
  getUserPlaylists,
  _pl,
  getPlaylist,
  _tracks,
  _sel,
  type TPL,
  type TTrack,
} from './tidal';

const token = ref(localStorage.getItem('authorizationCodeData'));
const userid = ref('204460008');
const playlists = ref<TPL[]>(_pl);
const selected = ref<TPL | null>(_sel);
const tracks = ref<TTrack[]>(_tracks);
// const newname = ref('');

const emit = defineEmits(['pl-tracks']);

onMounted(async () => {
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

  if (!selected.value) return;

  // load tracks
  if (tracks.value.length === 0) {
    const res = await getPlaylist(selected.value.id);
    if (res.data?.included) {
      tracks.value = res.data.included;
    }
  }

  if (tracks.value.length > 0) {
    emit('pl-tracks', tracks.value);
    return;
  }
});

const choose = async (pl: TPL) => {
  selected.value = pl;

  const res = await getPlaylist(pl.id);
  if (res.data?.included) {
    tracks.value = res.data.included;
    emit('pl-tracks', tracks.value);
  }
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
      <!-- <div class="my-8">
          <p>create playlist</p>
          <label for="newname">Name</label>
          <input v-model="newname" id="newname" name="newname" />
        </div> -->

      <div>
        <h3 class="text-xl font-semibold">choose playlist</h3>
        <ul>
          <li v-for="pl in playlists" :key="pl.id" @click="choose(pl)">
            {{ pl.attributes?.name }}
          </li>
        </ul>
      </div>
    </div>

    <!--  -->

    <div v-else>
      <div class="flex justify-between">
        <h3 class="text-xl font-semibold">{{ selected.attributes?.name }}</h3>
        <button @click="selected = null">cancel</button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped></style>
