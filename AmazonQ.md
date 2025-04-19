# LEJOG Cycling Map Application - Amazon Q Development Notes

This document captures the development process and problem-solving steps taken with Amazon Q to build the LEJOG Cycling Map application.

## Project Overview

The LEJOG Cycling Map application is a Node.js web application that displays cycling activities from a Land's End to John o' Groats journey on an interactive map. It integrates with the Strava API to fetch real cycling data and visualize routes.

## Development Process with Amazon Q

### Initial Setup

1. Created the basic project structure with Hapi.js as the server framework
2. Set up environment variables for Strava API credentials
3. Implemented Docker support for easier development

### Strava OAuth Integration

The most challenging part of the project was implementing the Strava OAuth authentication flow. Amazon Q helped solve several issues:

1. **OAuth Token Exchange Issue**: Initially encountered 400 Bad Request errors when exchanging the authorization code for an access token
   - Diagnosed the issue by examining detailed error logs
   - Identified that the `simple-oauth2` library was causing problems with the Strava API
   - Replaced the library with direct Axios calls to the Strava API endpoints

2. **Token Endpoint Path**: Fixed an incorrect token endpoint path
   - Changed from `/api/v3/oauth/token` to `/oauth/token`

3. **Token Refresh**: Implemented a more robust token refresh mechanism
   - Added direct timestamp comparison for token expiration
   - Improved error handling during the refresh process

### Route Data Processing Improvements

Amazon Q helped implement robust route data processing:

1. **Polyline Decoding**: Added a function to decode Strava's encoded polyline format
   - Implemented a fallback mechanism to use summary_polyline when stream data isn't available
   - Ensured consistent route data format for the map display

2. **Data Validation**: Added validation checks for route data
   - Verified that latlng data is properly formatted before using it
   - Implemented proper error handling for malformed data

3. **API Response Handling**: Fixed issues with the Strava API responses
   - Identified that the API was returning partial data in some cases
   - Implemented proper parsing and formatting of the response data

### Error Handling Improvements

Amazon Q helped implement robust error handling throughout the application:

1. **Activity Processing**: Changed from Promise.all to a sequential for-loop to prevent a single activity error from failing the entire request
2. **Fallback Mechanism**: Added proper fallback to sample data when API requests fail
3. **Detailed Logging**: Implemented comprehensive logging to help diagnose issues

### Development Workflow Enhancements

1. **Nodemon Integration**: Set up automatic server restarts during development
2. **Docker Configuration**: Created a development-friendly Docker setup with volume mounting for live code changes

## Key Learnings

1. **OAuth Implementation**: Direct API calls can sometimes be more reliable than OAuth libraries when dealing with specific API requirements
2. **Error Resilience**: Building applications that gracefully handle API failures is crucial for a good user experience
3. **Development Environment**: A well-configured development environment with tools like Nodemon and Docker significantly improves productivity
4. **Polyline Decoding**: Understanding and implementing polyline decoding is essential for working with map data from APIs like Strava
5. **Data Validation**: Always validate API responses before processing them to prevent errors in the application

## Future Development

With the foundation now solid, future development can focus on enhancing the user experience:

1. Elevation profiles for routes
2. Statistics dashboard
3. Photo integration
4. Weather data overlay
5. Progressive Web App capabilities
