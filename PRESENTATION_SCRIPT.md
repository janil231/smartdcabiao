# SMARTDCABIAO Presentation Script
## Capstone Project Presentation

---

## OPENING

> "Good morning/afternoon, everyone. We are [Your Names] and we are here to present our capstone project called **SMARTDCABIAO** - Smart Tourism and Digital Cabiao. This is a web-based tourism and digital marketplace platform for the Municipality of Cabiao, Nueva Ecija."

---

## PROBLEM STATEMENT

> "Our beneficiary, the LGU of Cabiao, faces several challenges in promoting local tourism and supporting local businesses. These include:
> - Limited digital visibility for local establishments
> - Difficulty in tracking tourism activities and impact
> - Lack of engagement tools for citizens and tourists
> - No centralized system for business registrations and submissions
>
> Our solution addresses all these challenges through a unified digital platform."

---

## SYSTEM OVERVIEW

> "SMARTDCABIAO is a complete web application built with modern technologies. It serves two main groups: the public (citizens and tourists) and the LGU administrators."

---

## PAGE BY PAGE WALKTHROUGH

### 1. HOME PAGE

> "This is our landing page. It features:
> - A welcoming hero section with images of Cabiao
> - Featured businesses carousel highlighting local establishments
> - Promotion section for business advertising
> - Quick map preview
> - Community activities section
> - Sustainable tourism tips
> - Footer with important links

> **Key feature:** This serves as the central hub that directs users to all other features of the system."

---

### 2. BUSINESSES PAGE

> "Users can browse all local businesses here. We have:
> - Filter tabs: All, Restaurants, Shops, Attractions
> - Search functionality
> - Business cards showing image, name, category, and description
> - 'View on Map' button to see location
>
> This helps tourists discover local establishments easily."

---

### 3. BUSINESS DETAIL PAGE

> "When a user clicks on a business, they see:
> - Full business information and photos
> - Contact details (phone, address, website)
> - Reviews and ratings from other users
> - Location on map
> - Ability to add to favorites
>
> This creates a complete profile for each business."

---

### 4. DESTINATIONS PAGE

> "Similar to businesses, but for tourist attractions:
> - Filter by barangay (village)
> - Search destinations
> - Attractions, landmarks, and points of interest
> - Rating display
> - View on map option

> This helps promote Cabiao's tourist spots."

---

### 5. MAP PAGE

> "Our interactive map is one of our key features:
> - Uses OpenStreetMap (free, no API costs)
> - Color-coded markers: Orange for restaurants, Blue for shops, Green for attractions
> - Filter buttons to show/hide different types
> - Click markers to see popup details
> - Desktop has a sidebar with all places list
> - Mobile has a bottom drawer for results

> **Demo tip:** "You can click any marker to see business details or navigate to their full page.""

---

### 6. FAVORITES PAGE

> "Logged-in users can save their favorite places:
> - Organized into Businesses and Destinations sections
> - Quick links to view details or see on map
> - Clear all option

> This improves user experience and return visits."

---

### 7. COMMUNITY ACTIVITIES (QUESTS) PAGE

> "This is our gamification feature - the core engagement tool:
> - Quests are activities users can join (clean-ups, tree planting, events)
> - Three types: Visit, Buy, and Participate
> - Users earn points for completing quests
> - Each quest shows capacity (slots left)
> - Impact tracking: kg of waste collected, trees planted, volunteer hours
> - Onboarding modal for new users explaining how it works

> **Key value:** This encourages community participation and environmental sustainability."

---

### 8. REWARDS PAGE

> "Users can view their achievements here:
> - Current season points balance
> - Total environmental impact (CO2 saved, plastic avoided, etc.)
> - Leaderboard showing top participants
> - Earned badges display
> - Badge progress tracking
> - Recommended quests to join

> This motivates continued engagement through recognition."

---

### 9. VOUCHER STORE PAGE

> "Our redemption system:
> - Browse available vouchers from partner businesses
> - Redeem points for discount vouchers
> - Each voucher has a unique QR code
> - Track voucher status: unused, used, expired
> - Copy code or show QR to merchant

> **Key benefit:** Points have real value - users can get discounts from local businesses."

---

### 10. SUGGEST PLACE PAGE

> "Citizens can suggest new businesses/destinations:
> - Form to submit new place suggestions
> - Fields: name, type, category, barangay, address, description, contact, images, coordinates
> - Goes to LGU admin for review
> - Validation ensures quality submissions

> This creates a community-driven approach to growing the database."

---

### 11. PROFILE PAGE

> "User dashboard shows:
> - Points and season statistics
> - Impact statistics (environment contributions)
> - Earned badges showcase
> - My submissions (status of suggested places)
> - Leaderboard settings (show/hide name)
> - Logout option

> Users can track their progress and contributions."

---

### 12. ABOUT PAGE

> "Information about the project:
> - Mission and vision
> - About Cabiao municipality
> - Technology stack used

> Provides context and credibility."

---

### 13. LGU DASHBOARD (ADMIN)

> "Now for the admin side - accessible only to LGU officials:
> 
> **Submissions Tab:** Review business/destination suggestions - Approve, Reject, or Request More Info
> 
> **Reports Tab:** Handle user-reported issues (duplicate listings, inappropriate content)
> 
> **Reviews Tab:** Moderate user reviews - Approve or reject
> 
> **Seasons Tab:** Create campaign seasons (e.g., "Summer 2026") - Activate/Close seasons
> 
> **Quests Tab:** Create and manage community activities - Set points, capacity, impact metrics
> 
> **Quest Verifications:** Verify user check-ins - Scan QR code or enter code manually
> 
> **Vouchers Tab:** Create vouchers for partners - Verify voucher redemptions
> 
> **Places Tab:** Full CRUD for businesses and destinations - Add, edit, delete entries

> **This gives the LGU complete control over the platform.**"

---

## KEY TECHNICAL FEATURES

> "Beyond the visible pages, our system includes:
> - **Firebase Backend:** Authentication, Firestore database, Storage for images
> - **Real-time Data:** Information updates instantly across all users
> - **Role-based Access:** Admin verification through Firestore (not hardcoded)
> - **Security Rules:** Firestore security rules protect data
> - **Image System:** Efficient image loading and caching
> - **Responsive Design:** Works on mobile, tablet, and desktop
> - **Multi-language Support:** English and Filipino translations
> - **Audit Logging:** All admin actions are logged for accountability"

---

## IMPACT & BENEFITS

> "For the **Municipality of Cabiao:**
> - Digital promotion of local tourism
> - Support for local businesses through increased visibility
> - Data-driven decision making
> - Community engagement tool
> - Environmental impact tracking
>
> For **Citizens and Tourists:**
> - Easy discovery of local places
> - Rewards for participating in community activities
> - Discounts through voucher system
> - Environmental contribution tracking
>
> For **Local Businesses:**
> - Free digital listing
> - Promotion opportunities
> - Voucher partnership program
> - Customer insights"

---

## DEMO SUGGESTIONS

> "During demo, we recommend showing:
> 1. Home page → highlight sections
> 2. Map page → click a marker → show popup
> 3. Business detail → show reviews
> 4. Community activities → join a quest
> 5. Voucher store → show a voucher QR code
> 6. Profile page → show stats
> 7. [If logged in as admin] LGU Dashboard → show management features"

---

## CLOSING

> "In summary, SMARTDCABIAO is a comprehensive digital platform that:
> - Promotes Cabiao's tourism and local businesses
> - Engages citizens through gamification
> - Rewards participation with tangible benefits
> - Empowers the LGU with management tools
> - Tracks environmental impact
>
> This concludes our presentation. Thank you for your time. We are ready to answer any questions."

---

## Q&A PREPARATION

### Common Questions to Prepare For:

**Q: How do you add an admin account?**
A: Through Firestore - create a document in the 'admins' collection with the user's UID, email, and role 'admin'. (Refer to ADMIN_SETUP_GUIDE.md)

**Q: How much does this cost to maintain?**
A: Firebase has a free tier that covers small projects. Costs only increase with heavy usage.

**Q: Can businesses add themselves?**
A: Not directly - they submit through the Suggest Place page, and LGU approves.

**Q: How do users earn points?**
A: By completing quests (attending clean-ups, visiting places, buying from partners).

**Q: Is this only for Cabiao?**
A: The coordinates are set for Cabiao, but the code can be modified for other municipalities.

---

## NOTES FOR PRESENTERS

- Speak slowly and clearly
- Have the demo prepared and tested before presentation
- Keep the browser zoom at 100% for best appearance
- Have backup internet ready if needed
- Know the admin login credentials if showing LGU dashboard
- Practice the transitions between pages
- Have confidence - you've built something useful!