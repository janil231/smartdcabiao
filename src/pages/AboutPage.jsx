import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-mobile-nav">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">About SMARTDCABIAO</h1>
            <p className="text-gray-600">
              Smart Tourism & Digital Cabiao - Your gateway to exploring the municipality
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: February 8, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is the official digital tourism platform of the Municipality of Cabiao, 
                Nueva Ecija. We are committed to promoting sustainable tourism, supporting local businesses, 
                and showcasing the rich cultural heritage of our community.
              </p>
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-800 text-sm">
                  <strong>Vision:</strong> To make Cabiao a premier tourist destination in Nueva Ecija through 
                  innovative digital solutions and community engagement.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About Cabiao, Nueva Ecija</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Geographic Location</h3>
                  <p className="text-blue-800 text-sm">
                    Cabiao is a first-class municipality in the province of Nueva Ecija, Philippines. 
                    Located in the central plains of Luzon, it serves as an important agricultural and 
                    commercial hub in the region.
                  </p>
                  <div className="mt-3 text-sm text-blue-800">
                    <strong>Coordinates:</strong> 15.2345°N, 120.8397°E<br />
                    <strong>Area:</strong> 109.36 km²<br />
                    <strong>Population:</strong> ~78,000 (2025 estimate)
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Economic Activities</h3>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Agriculture: Rice, vegetables, and fruit production</li>
                    <li>• Local businesses: Restaurants, shops, and services</li>
                    <li>• Tourism: Cultural sites and natural attractions</li>
                    <li>• Small-scale industries and handicrafts</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Platform Features</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="ml-3 font-medium text-gray-900">Interactive Map</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Discover local businesses and attractions with our real-time mapping system
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="ml-3 font-medium text-gray-900">Favorites System</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Save your favorite places and create personalized tourism itineraries
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="ml-3 font-medium text-gray-900">Community Activities</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Participate in local events and contribute to community development
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <h3 className="ml-3 font-medium text-gray-900">Rewards Program</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Earn points and rewards for participating in community activities
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Local Government Support</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is an initiative of the Municipal Government of Cabiao under the leadership 
                of our municipal officials and managed by the Municipal Tourism Office.
              </p>
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">Municipal Tourism Office</h3>
                <p className="text-purple-800 text-sm">
                  Our tourism office is dedicated to promoting Cabiao's natural beauty, cultural heritage, 
                  and economic potential through sustainable tourism practices and digital innovation.
                </p>
                <div className="mt-3 text-sm text-purple-800">
                  <strong>Services:</strong><br />
                  • Business registration and promotion<br />
                  • Event coordination and permits<br />
                  • Tourism information and assistance<br />
                  • Cultural heritage preservation
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Technology and Innovation</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO leverages modern web technologies to provide an accessible and user-friendly 
                tourism experience:
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Mobile-First Design</p>
                    <p className="text-sm text-gray-600">Responsive design works seamlessly on all devices</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Real-Time Information</p>
                    <p className="text-sm text-gray-600">Up-to-date business information and event schedules</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Secure Authentication</p>
                    <p className="text-sm text-gray-600">Multiple login options with data protection compliance</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Community Engagement</p>
                    <p className="text-sm text-gray-600">Features designed to foster local community participation</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Sustainable Tourism</h2>
              <p className="text-gray-700 leading-relaxed">
                We are committed to promoting sustainable tourism practices that preserve our natural 
                environment, respect local culture, and benefit the community economically.
              </p>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Our Sustainability Initiatives</h3>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• Promoting eco-friendly local businesses</li>
                  <li>• Supporting cultural heritage preservation</li>
                  <li>• Encouraging community-based tourism</li>
                  <li>• Implementing digital solutions to reduce paper waste</li>
                  <li>• Facilitating environmental activities and clean-up drives</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Get Involved</h2>
              <p className="text-gray-700 leading-relaxed">
                There are many ways to support SMARTDCABIAO and contribute to our community's growth:
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900 mb-2">For Businesses</h3>
                  <p className="text-amber-800 text-sm">
                    List your business, participate in events, and reach more customers through our platform.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">For Residents</h3>
                  <p className="text-blue-800 text-sm">
                    Join community activities, share local knowledge, and help promote our town.
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">For Tourists</h3>
                  <p className="text-green-800 text-sm">
                    Explore responsibly, support local businesses, and experience authentic Cabiao culture.
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">For Partners</h3>
                  <p className="text-purple-800 text-sm">
                    Collaborate with us on tourism initiatives and community development projects.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  For inquiries, partnerships, or tourism information:
                </p>
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-gray-900">Municipal Tourism Office</p>
                  <p className="text-sm text-gray-600">
                    Address: Municipal Hall, Poblacion, Cabiao, Nueva Ecija<br />
                    Phone: (044) 567-8901<br />
                    Email: tourism@cabiao.gov.ph<br />
                    Website: www.cabiao.gov.ph
                  </p>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Office Hours:</strong><br />
                      Monday - Friday: 8:00 AM - 5:00 PM<br />
                      Saturday: 8:00 AM - 12:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link 
            to="/privacy" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Privacy Policy
          </Link>
          <Link 
            to="/terms" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Terms of Service
          </Link>
          <Link 
            to="/data-deletion" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Data Deletion Request
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}