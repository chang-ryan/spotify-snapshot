# Spotify Snapshot

## `.env`

```sh
NUXT_PUBLIC_SPOTIFY_CLIENT_ID=spotify-client-id
NUXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

## Flow

1. https://developer.spotify.com/documentation/web-api/reference/get-recently-played

- Get a user's recently played tracks

2. https://developer.spotify.com/documentation/web-api/reference/create-playlist

- Create a new playlist

3. https://developer.spotify.com/documentation/web-api/reference/add-tracks-to-playlist

- Add all tracks returned from step 1 to playlist created in step 2
