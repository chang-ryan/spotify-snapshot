/**
 * Retrieve Spotify access token from state
 */
export default (): any => {
  const spotifyAccessToken = useState<any>('spotifyAcessToken')

  return spotifyAccessToken
}
