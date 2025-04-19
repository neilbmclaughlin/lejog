'use strict'

const fs = require('fs')
const path = require('path')
const axios = require('axios')

// Token storage path
const TOKEN_PATH = path.join(__dirname, '..', 'data', 'strava-token.json')

// Generate authorization URL
const getAuthorizationUrl = () => {
  const authorizationUri = `https://www.strava.com/oauth/authorize?` +
    `client_id=${process.env.STRAVA_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=activity:read_all` +
    `&approval_prompt=auto`
  
  console.log('Authorization URL:', authorizationUri)
  return authorizationUri
}

// Exchange authorization code for access token
const getAccessToken = async (code) => {
  try {
    console.log('Getting access token with code:', code)
    console.log('Redirect URI:', process.env.STRAVA_REDIRECT_URI)
    
    // Use axios directly to make the token request
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.STRAVA_REDIRECT_URI
    })
    
    console.log('Token received successfully')
    const token = response.data
    
    // Save token to file
    await saveToken(token)
    
    return token
  } catch (error) {
    console.error('Access Token Error:', error.message)
    if (error.response) {
      console.error('Error response:', error.response.data)
    }
    throw error
  }
}

// Save token to file
const saveToken = async (token) => {
  // Ensure data directory exists
  const dataDir = path.dirname(TOKEN_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Write token to file
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2))
  console.log('Token saved to file')
}

// Get token from file
const getToken = () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokenData = fs.readFileSync(TOKEN_PATH)
      return JSON.parse(tokenData)
    }
    return null
  } catch (error) {
    console.error('Error reading token file:', error)
    return null
  }
}

// Refresh token if expired
const refreshToken = async () => {
  const token = getToken()
  
  if (!token) {
    console.log('No token found, authentication required')
    return null
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000)
  if (token.expires_at <= now) {
    try {
      console.log('Token expired, refreshing...')
      
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token
      })
      
      console.log('Token refreshed successfully')
      const newToken = response.data
      await saveToken(newToken)
      return newToken
    } catch (error) {
      console.error('Error refreshing token:', error.message)
      if (error.response) {
        console.error('Error response:', error.response.data)
      }
      return null
    }
  }
  
  console.log('Using existing valid token')
  return token
}

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  refreshToken,
  getToken
}
