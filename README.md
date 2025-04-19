# LEJOG Cycling Map Application

A single-page Node.js application built with Hapi.js to display cycling activities from a Land's End to John o' Groats (LEJOG) journey on an interactive map.

## Overview

This application visualizes cycling activities between specific dates in 2024, showing the route taken from Land's End to John o' Groats across Britain. It uses Leaflet for map rendering and integrates with Strava's API to fetch actual cycling data.

## Features

- Interactive map display of cycling routes
- Activity details including distance, date, and route information
- Responsive design for both desktop and mobile viewing
- Strava API integration for real activity data
- OAuth 2.0 authentication flow
- Automatic token refresh
- Fallback to sample data when no activities are available
- Polyline decoding for reliable route display

## Technical Stack

- **Server**: Node.js with Hapi.js framework
- **Plugins**: @hapi/inert (static file serving), @hapi/vision (template rendering)
- **Map Library**: Leaflet.js
- **API Integration**: Strava OAuth API
- **HTTP Client**: Axios
- **Environment Variables**: dotenv
- **Development**: Nodemon for automatic server restarts

## Setup and Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` with your Strava API credentials:
   ```
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback
   LEJOG_START_DATE=2024-09-02
   LEJOG_END_DATE=2024-09-15
   ```
4. Start the server:
   ```
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`
6. Click "Connect to Strava" to authorize the application

## Docker Support

The application can be run in a Docker container with automatic code reloading for development:

```bash
# Build the Docker image
docker build -t lejog-app .

# Run the container
docker compose up -d

# View logs
docker logs -f lejog-app

# Stop the container
docker compose down
```

## Strava API Integration

The application uses Strava's OAuth 2.0 API to:

1. Authenticate users with their Strava account
2. Fetch cycling activities within the specified date range
3. Retrieve detailed route data for each activity
4. Display the routes on an interactive map

### Authentication Flow

1. User clicks "Connect to Strava"
2. User is redirected to Strava's authorization page
3. After granting permission, Strava redirects back to the application
4. The application exchanges the authorization code for access and refresh tokens
5. Tokens are stored securely for future API requests
6. Tokens are automatically refreshed when expired

### Route Data Processing

The application handles route data in multiple ways to ensure reliability:

1. Primary method: Fetch detailed stream data via Strava's streams API
2. Fallback method: Decode the summary polyline from the activity data
3. Validation: Ensure route data is properly formatted before displaying

## Project Structure

```
lejog/
├── data/                # Data storage (token)
├── public/              # Static assets
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   └── index.html       # Main HTML page
├── src/                 # Server-side code
│   ├── strava-api.js    # Strava API integration
│   └── strava-auth.js   # OAuth authentication
├── .env                 # Environment variables (not in git)
├── .env.example         # Example environment variables
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── nodemon.json         # Nodemon configuration
├── server.js            # Hapi server configuration
└── package.json         # Project dependencies
```

## Security Notes

### Subresource Integrity (SRI)

This project uses Subresource Integrity (SRI) for external resources like Leaflet's CSS and JavaScript files. SRI is a security feature that ensures the resources fetched by the browser haven't been tampered with.

How SRI works:
1. The `integrity` attribute in `<script>` and `<link>` tags contains a cryptographic hash of the expected content
2. When the browser downloads the resource, it verifies that the content matches the hash
3. If the hashes don't match, the browser refuses to execute or apply the resource

Example:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""/>
```

The `crossorigin` attribute is used alongside `integrity` because SRI requires CORS (Cross-Origin Resource Sharing) to function properly.

### OAuth Security

The application implements OAuth 2.0 for secure authentication with Strava:

1. Tokens are stored securely in the data directory
2. Automatic token refresh when expired
3. Environment variables for sensitive credentials
4. HTTPS recommended for production use

## Development Notes

### Using Nodemon

The application uses Nodemon for automatic server restarts during development. When you make changes to the code, the server will automatically restart to reflect those changes.

### Error Handling

The application includes robust error handling to:
1. Gracefully handle API rate limits and errors
2. Fall back to sample data when necessary
3. Continue processing activities even if individual activities fail
4. Provide meaningful error messages in the logs
5. Handle malformed or missing route data

### Debugging

For debugging API responses, you can use:

```bash
# Get a list of activities
curl -H "Authorization: Bearer $TOKEN" "https://www.strava.com/api/v3/athlete/activities?per_page=1" | jq

# Get streams for a specific activity
curl -H "Authorization: Bearer $TOKEN" "https://www.strava.com/api/v3/activities/ACTIVITY_ID/streams?keys=latlng&key_by_type=true" | jq
```

## Future Enhancements

- Elevation profiles for each day's route
- Statistics dashboard for the entire journey
- Photo integration from the journey
- Weather data overlay
- Multi-user support
- Progressive Web App (PWA) capabilities
- Offline support
- Improved mobile experience

## License

ISC
