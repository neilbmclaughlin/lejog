'use strict'

const Hapi = require('@hapi/hapi')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Import Strava modules
const stravaAuth = require('./src/strava-auth')
const stravaApi = require('./src/strava-api')

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: '0.0.0.0', // Changed from localhost to 0.0.0.0 to work in Docker
    routes: {
      files: {
        relativeTo: Path.join(__dirname, 'public')
      },
      cors: true // Enable CORS for all routes
    }
  })

  // Register plugins
  await server.register([
    Inert,
    Vision
  ])

  // Static file serving
  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: true
      }
    }
  })

  // Main application route
  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return h.file('index.html')
    }
  })

  // Strava authorization route
  server.route({
    method: 'GET',
    path: '/auth',
    handler: (request, h) => {
      const authUrl = stravaAuth.getAuthorizationUrl()
      return h.redirect(authUrl)
    }
  })

  // Strava callback route
  server.route({
    method: 'GET',
    path: '/auth/callback',
    handler: async (request, h) => {
      try {
        const { code } = request.query
        
        if (!code) {
          console.error('No authorization code received')
          throw new Error('Authorization code not received')
        }
        
        console.log('Received authorization code:', code)
        
        // Exchange code for token
        await stravaAuth.getAccessToken(code)
        
        return h.redirect('/?auth=success')
      } catch (error) {
        console.error('Auth callback error:', error.message)
        return h.redirect('/?auth=error')
      }
    }
  })

  // API route for cycling activities
  server.route({
    method: 'GET',
    path: '/api/activities',
    handler: async (request, h) => {
      try {
        // Check if we have a valid token
        const token = stravaAuth.getToken()
        
        if (!token) {
          console.log('No token available, returning sample data')
          // Return sample data if no token
          return getSampleActivities()
        }
        
        // Get LEJOG date range from environment variables
        const startDate = process.env.LEJOG_START_DATE || '2024-09-02'
        const endDate = process.env.LEJOG_END_DATE || '2024-09-15'
        
        console.log(`Fetching activities for date range: ${startDate} to ${endDate}`)
        
        try {
          // Get activities from Strava
          const activities = await stravaApi.processActivitiesForMap(startDate, endDate)
          
          if (activities && activities.length > 0) {
            console.log(`Returning ${activities.length} real activities`)
            return activities
          } else {
            console.log('No activities found, returning sample data')
            return getSampleActivities()
          }
        } catch (error) {
          console.error('Error fetching activities from Strava:', error.message)
          console.log('Falling back to sample data due to error')
          return getSampleActivities()
        }
      } catch (error) {
        console.error('Error in /api/activities route:', error.message)
        
        // Return sample data on error
        console.log('Returning sample data due to error')
        return getSampleActivities()
      }
    }
  })

  // Auth status route
  server.route({
    method: 'GET',
    path: '/api/auth/status',
    handler: async (request, h) => {
      const token = stravaAuth.getToken()
      return { authenticated: !!token }
    }
  })

  // Athlete profile route
  server.route({
    method: 'GET',
    path: '/api/athlete',
    handler: async (request, h) => {
      try {
        const athlete = await stravaApi.getAthlete()
        return athlete
      } catch (error) {
        console.error('Error fetching athlete:', error.message)
        return h.response({ error: 'Failed to fetch athlete data' }).code(500)
      }
    }
  })

  await server.start()
  console.log('Server running on %s', server.info.uri)
}

// Sample activities for testing or when Strava is not connected
function getSampleActivities() {
  console.log('Returning sample activities')
  return [
    {
      id: 1,
      name: "Day 1: Land's End to Bodmin",
      date: '2024-09-02',
      distance: 83.7, // km
      startPoint: [50.0657, -5.7147], // Land's End
      endPoint: [50.4722, -4.7235], // Bodmin
      // Simplified route coordinates
      route: [
        [50.0657, -5.7147],
        [50.1269, -5.5284],
        [50.2660, -5.0527],
        [50.3429, -4.8731],
        [50.4722, -4.7235]
      ]
    },
    {
      id: 2,
      name: 'Day 2: Bodmin to Exeter',
      date: '2024-09-03',
      distance: 132.5, // km
      startPoint: [50.4722, -4.7235], // Bodmin
      endPoint: [50.7236, -3.5275], // Exeter
      // Simplified route coordinates
      route: [
        [50.4722, -4.7235],
        [50.5060, -4.4672],
        [50.5846, -4.1444],
        [50.6546, -3.8963],
        [50.7236, -3.5275]
      ]
    }
  ]
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()
