'use strict'

// Initialize the map centered on the UK
const map = L.map('map').setView([54.5, -4.0], 6)

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18
}).addTo(map)

// Store activities data and layers
let activities = []
const activityLayers = {}

// Format date in a user-friendly way
function formatDate(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('en-GB', options)
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status')
    const data = await response.json()
    
    // Update UI based on auth status
    const authButton = document.getElementById('auth-button')
    if (authButton) {
      if (data.authenticated) {
        authButton.textContent = 'Connected to Strava'
        authButton.disabled = true
        authButton.classList.add('connected')
      } else {
        authButton.textContent = 'Connect to Strava'
        authButton.disabled = false
        authButton.classList.remove('connected')
        authButton.addEventListener('click', () => {
          window.location.href = '/auth'
        })
      }
    }
    
    return data.authenticated
  } catch (error) {
    console.error('Error checking auth status:', error)
    return false
  }
}

// Fetch activities from the API
async function fetchActivities() {
  try {
    const response = await fetch('/api/activities')
    activities = await response.json()
    console.log('Fetched activities:', activities)
    displayActivities()
  } catch (error) {
    console.error('Error fetching activities:', error)
    document.getElementById('activity-list').innerHTML = '<p>Error loading activities. Please try again later.</p>'
  }
}

// Display activities in the sidebar
function displayActivities() {
  const activityList = document.getElementById('activity-list')
  activityList.innerHTML = ''
  
  if (!activities || activities.length === 0) {
    activityList.innerHTML = '<p>No activities found for the selected date range.</p>'
    return
  }
  
  activities.forEach(activity => {
    const activityItem = document.createElement('div')
    activityItem.className = 'activity-item'
    activityItem.dataset.id = activity.id
    
    activityItem.innerHTML = `
      <div class="activity-name">${activity.name}</div>
      <div class="activity-date">${formatDate(activity.date)}</div>
      <div class="activity-distance">${activity.distance ? activity.distance.toFixed(1) : 'N/A'} km</div>
    `
    
    activityItem.addEventListener('click', () => {
      // Remove active class from all activities
      document.querySelectorAll('.activity-item').forEach(item => {
        item.classList.remove('active')
      })
      
      // Add active class to clicked activity
      activityItem.classList.add('active')
      
      // Show this activity on the map
      showActivityOnMap(activity)
    })
    
    activityList.appendChild(activityItem)
    
    // Create map layer for this activity
    createActivityLayer(activity)
  })
  
  // Show the first activity by default if there are any
  if (activities.length > 0) {
    const firstActivityItem = document.querySelector('.activity-item')
    firstActivityItem.classList.add('active')
    showActivityOnMap(activities[0])
  }
}

// Create a map layer for an activity
function createActivityLayer(activity) {
  console.log('Creating layer for activity:', activity.id, activity.name)
  
  // Skip if no route data
  if (!activity.route || activity.route.length === 0) {
    console.warn('No route data for activity:', activity.id)
    return
  }
  
  // Create a polyline for the route
  const routeLine = L.polyline(activity.route, {
    color: '#4CAF50',
    weight: 5,
    opacity: 0.7
  })
  
  // Create markers for start and end points if they exist
  let startMarker, endMarker
  
  if (activity.startPoint && activity.startPoint.length === 2) {
    startMarker = L.marker(activity.startPoint, {
      title: `Start: ${activity.name}`
    })
  }
  
  if (activity.endPoint && activity.endPoint.length === 2) {
    endMarker = L.marker(activity.endPoint, {
      title: `End: ${activity.name}`
    })
  }
  
  // Create a layer group for this activity
  const layers = [routeLine]
  if (startMarker) layers.push(startMarker)
  if (endMarker) layers.push(endMarker)
  
  const activityLayer = L.layerGroup(layers)
  
  // Store the layer for later use
  activityLayers[activity.id] = activityLayer
}

// Show a specific activity on the map
function showActivityOnMap(activity) {
  console.log('Showing activity on map:', activity.id, activity.name)
  
  // Remove all activity layers from the map
  Object.values(activityLayers).forEach(layer => {
    if (layer) map.removeLayer(layer)
  })
  
  // Add the selected activity layer to the map
  const layer = activityLayers[activity.id]
  if (layer) {
    layer.addTo(map)
    
    // Fit the map to the activity bounds if route exists
    if (activity.route && activity.route.length > 0) {
      try {
        const routeBounds = L.latLngBounds(activity.route)
        map.fitBounds(routeBounds, {
          padding: [50, 50]
        })
      } catch (error) {
        console.error('Error fitting bounds:', error)
        // Fallback to UK view
        map.setView([54.5, -4.0], 6)
      }
    }
  } else {
    console.warn('No layer found for activity:', activity.id)
  }
}

// Handle URL parameters
function handleUrlParams() {
  const urlParams = new URLSearchParams(window.location.search)
  const authStatus = urlParams.get('auth')
  
  if (authStatus === 'success') {
    showNotification('Successfully connected to Strava!', 'success')
    // Remove the parameter from URL
    window.history.replaceState({}, document.title, '/')
  } else if (authStatus === 'error') {
    showNotification('Error connecting to Strava. Please try again.', 'error')
    // Remove the parameter from URL
    window.history.replaceState({}, document.title, '/')
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message
  
  // Add close button
  const closeButton = document.createElement('span')
  closeButton.className = 'notification-close'
  closeButton.innerHTML = '&times;'
  closeButton.addEventListener('click', () => {
    document.body.removeChild(notification)
  })
  
  notification.appendChild(closeButton)
  document.body.appendChild(notification)
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification)
    }
  }, 5000)
}

// Initialize the application
async function init() {
  console.log('Initializing application...')
  handleUrlParams()
  await checkAuthStatus()
  await fetchActivities()
}

// Start the application when the page loads
window.addEventListener('DOMContentLoaded', init)
