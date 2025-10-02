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
} from './tidal';

type Track = {
  id: string;
  type: string;
  attributes?: {
    title?: string;
    [key: string]: any;
  };
};

type PL = {
  type: string;
  id: string;
  attributes?: {
    name: string;
    numberOfItems?: number;
  };
};

const token = ref(localStorage.getItem('authorizationCodeData'));
const userid = ref('204460008');
const playlists = ref<PL[]>(_pl);
const selected = ref<PL | null>(_sel);
const tracks = ref<Track[]>(_tracks);
const newname = ref('');

onMounted(async () => {
  await handleRedirect();

  const stored = await getDecodedToken();
  if (!stored) return;

  token.value = stored;
  // const resp = await searchTrack('eminem slim');

  if (!userid.value) {
    const user = await getUser();
    if (!user) return;
    userid.value = user.id;
    // if (user.attributes) countrycode.value = user.attributes.country;
  }

  if (!playlists.value) {
    const res = await getUserPlaylists(userid.value);
    if (res.data) {
      playlists.value = res.data?.data;
    }
  }
});

const choose = async (pl: PL) => {
  selected.value = pl;

  const res = await getPlaylist(pl.id);
  if (res.data?.included) {
    tracks.value = res.data.included;
  }
};
</script>

<template>
  <div>
    <h2>Tidal</h2>
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
        </div>

        <div>
          <h3>choose playlist</h3>
          <ul>
            <li v-for="pl in playlists" :key="pl.id" @click="choose(pl)">
              {{ pl.attributes?.name }}
            </li>
          </ul>
        </div>
      </div>

      <!--  -->

      <div v-else>
        <div class="x my-4">
          <h3>{{ selected.attributes?.name }}</h3>
          <p>{{ tracks.length }} tracks</p>
        </div>
        <ul>
          <li v-for="tr in tracks" :key="tr.id">
            {{ tr.attributes?.title }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
