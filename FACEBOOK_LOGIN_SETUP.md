# Facebook Login Setup Guide

## Overview
SMARTDCABIAO now supports Facebook authentication for seamless user login. This guide will help you set up Facebook login properly.

## Prerequisites

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Click "Create App" > "Business"
3. Enter app name: "SMARTDCABIAO"
4. Select "Business" and click "Create App"

### 2. Configure Facebook Login
1. In your app dashboard, find "Facebook Login" under "Products"
2. Click "Set up" > "Web"
3. Add your site URL: `http://localhost:5173` (for development)
4. For production: `https://your-domain.com`

### 3. Get App Credentials
1. Go to Settings > Basic
2. Copy your "App ID"
3. Add this to your `.env` file:
   ```
   VITE_FACEBOOK_APP_ID=your-facebook-app-id
   ```

## Firebase Configuration

### 1. Enable Facebook Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication > Sign-in method
4. Enable "Facebook" provider
5. Enter your Facebook App ID and App Secret
6. Add authorized domains:
   - `http://localhost:5173` (development)
   - `https://your-domain.com` (production)

### 2. OAuth Redirect URI
Copy the OAuth redirect URI from Firebase and add it to your Facebook App:
1. Go to Facebook Developers > Your App > Facebook Login > Settings
2. Add the Firebase OAuth URI to "Valid OAuth Redirect URIs"

## Features Available

### ✅ What's Implemented:
- **Facebook Login Button**: Click "Continue with Facebook" in login modal
- **User Profile Data**: Automatically fetches user name, email, and profile picture
- **Secure Authentication**: Uses Firebase Authentication with Facebook provider
- **Error Handling**: Graceful error messages for login failures
- **Mobile Responsive**: Works on all devices

### 🔐 Security Features:
- OAuth 2.0 standard authentication
- Firebase security integration
- No password storage on client side
- Secure token handling

## Usage Instructions

### For Users:
1. Click "Login" button in navbar
2. Click "Continue with Facebook"
3. Authorize SMARTDCABIAO in Facebook popup
4. Automatically logged in and redirected

### For Developers:
The login is already integrated in the existing authentication flow:
- `AuthContext` includes `signInWithFacebook()` method
- `LoginModal` includes Facebook button
- User data flows through existing auth system

## Testing

### Development Testing:
1. Use the Facebook App in development mode
2. Test with your own Facebook account
3. Verify user data appears correctly in app

### Production Deployment:
1. Switch Facebook App to live mode
2. Update Firebase domains to production URL
3. Test thoroughly before release

## Troubleshooting

### Common Issues:
1. **"Invalid App ID"**: Check your `.env` file
2. **"Redirect URI mismatch"**: Verify Firebase and Facebook URIs match
3. **"App not in development mode"**: Ensure app is in development mode during testing

### Error Messages:
- Clear error messages shown in login modal
- Check browser console for detailed error information
- Ensure all domains are properly configured

## Benefits for SMARTDCABIAO

### 🎯 Business Benefits:
- **User Engagement**: Easy login reduces friction
- **User Data**: Access to verified user profiles
- **Trust**: Facebook's familiar authentication increases confidence

### 👥 Community Benefits:
- **Easy Participation**: Quick access to community features
- **Social Integration**: Users can connect with friends
- **Event Sharing**: Easy sharing of local events

## Future Enhancements

### 📈 Potential Additions:
- Facebook sharing for businesses/events
- Facebook friend recommendations
- Facebook events integration
- Social leaderboards
- Community activity sharing

## Support

If you encounter issues:
1. Check this guide first
2. Verify all configuration steps
3. Test in development environment
4. Review Facebook and Firebase documentation

---

*Facebook login is now ready to use! Configure your Facebook App ID in the environment variables and start accepting users.*