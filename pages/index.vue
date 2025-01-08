<script setup lang="ts">
import debounce from 'lodash-es/debounce'
import get from 'lodash-es/get'

const {
  public: {
    spotifyClientId,
    spotifyRedirectUri,
  },
} = useRuntimeConfig()

const spotifyAccessToken = useSpotifyAccessToken()
const spotifyUser = useSpotifyUser()

const spotifyPlaylistCreated = ref()
const playlistName = ref('')
const trackQuantity = ref(50)
// const datetime12h = ref()
const publicPlaylist = ref(true)
const playHistory = ref()
const success = ref(false)
const errors: Ref<string[]> = ref([])

async function redirectToAuthCodeFlow() {
  const verifier = generateCodeVerifier(128)
  const challenge = await generateCodeChallenge(verifier)

  localStorage.setItem('verifier', verifier)

  const params = new URLSearchParams()
  params.append('client_id', spotifyClientId)
  params.append('response_type', 'code')
  params.append('redirect_uri', String(spotifyRedirectUri))
  params.append('scope', 'user-read-private user-read-email user-read-recently-played playlist-modify-public playlist-modify-private')
  params.append('code_challenge_method', 'S256')
  params.append('code_challenge', challenge)

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`
}

function generateCodeVerifier(length: number) {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const createPlaylistLoading = ref(false)

async function createPlaylist() {
  createPlaylistLoading.value = true

  if (errors.value.length > 0)
    return

  // 1. Create playlist
  try {
    const result = await fetch(`https://api.spotify.com/v1/users/${spotifyUser.value.id}/playlists`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${spotifyAccessToken.value}` },
      body: JSON.stringify({
        name: playlistName.value,
        public: publicPlaylist.value,
      }),
    })

    spotifyPlaylistCreated.value = await result.json()
  }
  catch (error) {
    console.error('Failed to create playlist', error)
    throw new Error('Failed to create playlist')
  }

  // 2. Add tracks to playlist
  try {
    const result = await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistCreated.value.id}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${spotifyAccessToken.value}` },
      body: JSON.stringify({
        uris: playHistory.value.items.map(
          (item: any) => item.track.uri,
        ),
      }),
    })

    const tracksAdded = await result.json()

    if (tracksAdded?.snapshot_id?.length) {
      success.value = true
    }
  }
  catch (error) {
    console.error('Failed to add tracks to playlist', error)
  }

  createPlaylistLoading.value = false
}

watchEffect(() => {
  errors.value = []

  if (!playlistName.value) {
    errors.value.push('Playlist name is required')
    createPlaylistLoading.value = false
  }

  if (trackQuantity.value < 1 || trackQuantity.value > 50) {
    errors.value.push('Track quantity must be between 1 and 50')
    createPlaylistLoading.value = false
  }
})

watch(
  trackQuantity,
  debounce(
    async () => {
      try {
        const params = new URLSearchParams({
          limit: String(trackQuantity.value),
          before: String(new Date().getTime()),
        })
        const url = `https://api.spotify.com/v1/me/player/recently-played?${params.toString()}`

        const result = await fetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${spotifyAccessToken.value}` },
        })

        playHistory.value = await result.json()
      }
      catch (error) {
        console.error(error)
      }
    },
    500,
  ),
  { immediate: true },
)
</script>

<template>
  <div class="flex items-center flex-col p-16">
    <h1 class="text-xl mb-2">
      Spotify Snapshot
    </h1>
    <p class="mb-4">
      Snapshot the last 50 songs you listened to and instantly save it into a new playlist.
      Useful if you've been DJ'ing a party or something and want to save the immaculate vibes you just cooked up.
    </p>

    <template v-if="spotifyAccessToken">
      <div class="w-96">
        <div class="text-center mb-2">
          Hello <span class="text-[#19e526]">{{ spotifyUser.display_name }}</span>
        </div>

        <div class="step-container">
          <h2 class="step-title">
            Step 1
          </h2>
          <div class="flex flex-col">
            <label for="playlist-name" class="mb-1">Name your playlist:</label>
            <input
              id="playlist-name" v-model="playlistName" type="text" placeholder="The Best Day Ever"
              class="p-2 outline-none border border-white" required
            >
          </div>
        </div>

        <!-- <div class="step-container">
          <h2 class="step-title">
            Step 2
          </h2>
          <label for="datepicker-12h">Pick the date and time:</label>
          <DatePicker id="datepicker-12h" v-model="datetime12h" show-time hour-format="12" fluid />
          <p class="text-sm">
            The last 50 songs before this date and time will be selected.
          </p>
        </div> -->

        <div class="step-container">
          <h2 class="step-title">
            Step 2
          </h2>

          <div class="flex flex-col">
            <label for="track-quantity" class="mb-1">How many songs do you want:</label>
            <input
              id="track-quantity" v-model="trackQuantity" type="text" placeholder="1-50"
              class="p-2 outline-none border border-white" required
            >
            <span class="text-sm">Max 50</span>
          </div>
        </div>

        <div class="mb-4">
          <li v-for="item in playHistory?.items" :key="item.played_at" class="list-none text-sm">
            "{{ item?.track?.name }}" by {{ get(item, 'track.artists[0].name') }}
          </li>
        </div>

        <div>
          <label for="public-playlist" class="text-sm mr-2">Public</label>
          <input v-model="publicPlaylist" type="checkbox" true-value="true" false-value="false">
        </div>

        <button :disabled="createPlaylistLoading" class="button" @click="createPlaylist">
          {{ createPlaylistLoading ? 'Creating Playlist...' : 'Create Playlist' }}
        </button>

        <div v-if="errors">
          <div v-for="error in errors" :key="error" class="text-sm text-red-400">
            {{ error }}
          </div>
        </div>

        <div v-if="success">
          <div>Success! ✅</div>
          <div>
            See your playlist here:
            <a :href="spotifyPlaylistCreated?.external_urls?.spotify" target="_blank">
              {{ spotifyPlaylistCreated?.external_urls?.spotify }}
            </a>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <button v-if="!spotifyAccessToken" class="button" @click="redirectToAuthCodeFlow">
        Log in with your Spotify account
      </button>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.step-container {
  @apply w-full;
  @apply mb-8;
}

.step-title {
  @apply text-lg;
  @apply mb-2;
}

.button {
  @apply border;
  @apply border-white;
  @apply p-2;
  @apply rounded;
}
</style>
