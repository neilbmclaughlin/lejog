'use strict'

const axios = require('axios')
const { refreshToken, getToken } = require('./strava-auth')

// Base URL for Strava API
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3'

// Get authenticated API client
const getApiClient = async () => {
  // Refresh token if needed
  const token = await refreshToken()
  
  if (!token) {
    throw new Error('No valid token available')
  }
  
  // Create axios instance with auth header
  return axios.create({
    baseURL: STRAVA_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token.access_token}`
    }
  })
}

// Get athlete profile
const getAthlete = async () => {
  try {
    const api = await getApiClient()
    const response = await api.get('/athlete')
    return response.data
  } catch (error) {
    console.error('Error fetching athlete data:', error.message)
    throw error
  }
}

// Get activities within date range
const getActivities = async (startDate, endDate) => {
  try {
    const api = await getApiClient()
    
    // Convert dates to timestamps
    const after = new Date(startDate).getTime() / 1000
    const before = new Date(endDate).getTime() / 1000
    
    console.log(`Fetching activities between ${startDate} (${after}) and ${endDate} (${before})`)
    
    // Get activities (paginated)
    let page = 1
    const perPage = 30
    let allActivities = []
    let hasMore = true
    
    while (hasMore) {
      console.log(`Fetching page ${page} of activities...`)
      const response = await api.get('/athlete/activities', {
        params: {
          after,
          before,
          page,
          per_page: perPage
        }
      })
      
      const activities = response.data
      console.log(`Received ${activities.length} activities`)
      allActivities = [...allActivities, ...activities]
      
      // Check if we need to fetch more pages
      hasMore = activities.length === perPage
      page++
    }
    
    return allActivities
  } catch (error) {
    console.error('Error fetching activities:', error.message)
    throw error
  }
}

// Get detailed activity with streams (for route data)
const getActivityDetails = async (activityId) => {
  try {
    const api = await getApiClient()
    
    // Get activity details
    console.log(`Fetching details for activity ${activityId}`)
    const activityResponse = await api.get(`/activities/${activityId}`)
    const activity = activityResponse.data
    
    // Get streams (route data)
    console.log(`Fetching streams for activity ${activityId}`)
    try {
      const streamsResponse = await api.get(`/activities/${activityId}/streams`, {
        params: {
          keys: 'latlng',
          key_by_type: true
        }
      })
      
      // Check if we have valid latlng data
      if (streamsResponse.data && 
          streamsResponse.data.latlng && 
          Array.isArray(streamsResponse.data.latlng.data)) {
        
        // Combine activity data with streams
        return {
          ...activity,
          streams: {
            latlng: streamsResponse.data.latlng
          }
        }
      } else {
        console.warn(`No valid latlng data for activity ${activityId}`)
        // Use summary polyline from activity if available
        if (activity.map && activity.map.summary_polyline) {
          console.log(`Using summary_polyline for activity ${activityId}`)
          return {
            ...activity,
            streams: {
              latlng: {
                data: decodePolyline(activity.map.summary_polyline)
              }
            }
          }
        }
      }
    } catch (streamError) {
      console.error(`Error fetching streams for activity ${activityId}:`, streamError.message)
      // Use summary polyline from activity if available
      if (activity.map && activity.map.summary_polyline) {
        console.log(`Using summary_polyline for activity ${activityId}`)
        return {
          ...activity,
          streams: {
            latlng: {
              data: decodePolyline(activity.map.summary_polyline)
            }
          }
        }
      }
    }
    
    // If we get here, we couldn't get any route data
    return {
      ...activity,
      streams: { latlng: null }
    }
  } catch (error) {
    console.error(`Error fetching activity details for ID ${activityId}:`, error.message)
    // Return a minimal activity object instead of throwing
    return {
      id: activityId,
      name: `Activity ${activityId}`,
      streams: { latlng: null }
    }
  }
}

// Process activities for LEJOG map
const processActivitiesForMap = async (startDate, endDate) => {
  try {
    // Get all activities in date range
    const activities = await getActivities(startDate, endDate)
    
    // Filter for ride activities only
    const rides = activities.filter(activity => activity.type === 'Ride')
    console.log(`Found ${rides.length} ride activities in date range`)
    
    // Sort by start date
    rides.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    
    // Get detailed data for each ride
    const detailedRides = []
    
    for (const ride of rides) {
      try {
        const details = await getActivityDetails(ride.id)
        
        // Extract route coordinates from streams
        const route = details.streams && details.streams.latlng && details.streams.latlng.data ? 
          details.streams.latlng.data.map(point => {
            return [point[0], point[1]] // Ensure we're returning [lat, lng] arrays
          }) : []
        
        if (route.length > 0) {
          detailedRides.push({
            id: details.id,
            name: details.name,
            date: details.start_date,
            distance: details.distance / 1000, // Convert meters to kilometers
            movingTime: details.moving_time,
            elevationGain: details.total_elevation_gain,
            startPoint: route.length > 0 ? [route[0][0], route[0][1]] : null,
            endPoint: route.length > 0 ? [route[route.length - 1][0], route[route.length - 1][1]] : null,
            route: route
          })
        } else {
          console.warn(`No route data available for activity ${ride.id}`)
        }
      } catch (error) {
        console.error(`Error processing activity ${ride.id}:`, error.message)
        // Continue with next activity
      }
    }
    
    console.log(`Successfully processed ${detailedRides.length} activities`)
    return detailedRides
  } catch (error) {
    console.error('Error processing activities for map:', error.message)
    throw error
  }
}

// Decode a polyline string into an array of [lat, lng] coordinates
function decodePolyline(polyline) {
  if (!polyline) return [];
  
  const points = [];
  let index = 0;
  const len = polyline.length;
  let lat = 0;
  let lng = 0;
  
  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = polyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    
    shift = 0;
    result = 0;
    
    do {
      b = polyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    
    points.push([lat * 1e-5, lng * 1e-5]);
  }
  
  return points;
}

module.exports = {
  getAthlete,
  getActivities,
  getActivityDetails,
  processActivitiesForMap
}
