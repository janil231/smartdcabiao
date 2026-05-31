import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-mobile-nav">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">
              How SMARTDCABIAO collects, uses, and protects your information
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: February 8, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is the official tourism platform of the Municipality of Cabiao, Nueva Ecija. 
                This privacy policy explains what information we collect, how we use it, and your rights 
                regarding your personal data when using our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Authentication Data</h3>
                  <p className="text-blue-800 text-sm">
                    When you create an account, we collect only essential profile information from your chosen authentication method:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    <li>• Email address</li>
                    <li>• Display name</li>
                    <li>• Profile photo (optional, from Google/Facebook)</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-700">
                    We use Firebase Authentication to securely handle login with Google, Facebook, or email.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">App Usage Data</h3>
                  <p className="text-green-800 text-sm">
                    Information you provide while using the platform:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-green-800">
                    <li>• Favorite businesses and destinations</li>
                    <li>• Community activity participation records</li>
                    <li>• Points and rewards earned</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Technical Data</h3>
                  <p className="text-gray-800 text-sm">
                    Automatically collected information for app functionality:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-800">
                    <li>• Device type and browser information</li>
                    <li>• IP address (general location only)</li>
                    <li>• App usage patterns (anonymized)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Account Management</p>
                    <p className="text-sm text-gray-600">To provide and maintain your account, authentication, and personalized experience</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">App Features</p>
                    <p className="text-sm text-gray-600">To save favorites, track participation, and provide rewards functionality</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Service Improvement</p>
                    <p className="text-sm text-gray-600">To understand usage patterns and improve our tourism platform</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div>
                    <p className="font-medium text-gray-900">Legal Compliance</p>
                    <p className="text-sm text-gray-600">To comply with applicable laws and protect municipal interests</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Storage and Security</h2>
              <p className="text-gray-700 leading-relaxed">
                Your data is stored securely using Firebase (Google Cloud) with industry-standard encryption and security measures. 
                We retain your account data only as long as necessary to provide the tourism platform services, unless required by law.
              </p>
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> We do not sell, rent, or share your personal information with third parties for marketing purposes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed">You have the right to:</p>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li>• Access your personal information</li>
                <li>• Update your profile information</li>
                <li>• Delete your account and associated data</li>
                <li>• Export your data</li>
                <li>• Opt out of non-essential data collection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is not directed to children under 13. We do not knowingly collect 
                personal information from children under 13. If we become aware of such collection, 
                we will take immediate steps to delete the information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time. We will notify users of significant 
                changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  For privacy concerns or data deletion requests, please contact us:
                </p>
                <p className="mt-2 font-medium text-gray-900">
                  Municipal Tourism Office
                </p>
                <p className="text-sm text-gray-600">
                  Email: tourism@cabiao.gov.ph<br />
                  Phone: (044) 567-8901<br />
                  Address: Municipal Hall, Cabiao, Nueva Ecija
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
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
          <Link 
            to="/about" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            About SMARTDCABIAO
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}