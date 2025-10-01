<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { login, handleRedirect, getDecodedToken, getuser, search } from './tidal';

const token = ref(localStorage.getItem('authorizationCodeData'));

onMounted(async () => {
  await handleRedirect();

  const stored = await getDecodedToken();
  if (stored) {
    token.value = stored;
    const resp = await search('eminem');
    console.log(resp);
  }
});
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
      <h2>tidal</h2>
      <p>{{ token }}</p>
    </div>
  </div>
</template>

<style scoped></style>
