<script setup lang="ts">
const route = useRoute()
const code = computed(() => String(route.query.code))
const spotifyAccessToken = useSpotifyAccessToken()
const spotifyUser = useSpotifyUser()

const {
  public: {
    spotifyClientId,
  },
} = useRuntimeConfig()

async function getAccessToken(code: string) {
  const verifier = localStorage.getItem('verifier')

  const params = new URLSearchParams()
  params.append('client_id', spotifyClientId)
  params.append('grant_type', 'authorization_code')
  params.append('code', code)
  params.append('redirect_uri', 'http://localhost:3000/callback')
  params.append('code_verifier', verifier!)

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const { access_token } = await result.json()
  return access_token
}

onMounted(async () => {
  if (code.value) {
    spotifyAccessToken.value = await getAccessToken(code.value)

    const result = await fetch('https://api.spotify.com/v1/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${spotifyAccessToken.value}` },
    })

    spotifyUser.value = await result.json()
  }

  navigateTo('/')
})
</script>

<template>
  <div>
    Authorizing
  </div>
</template>
