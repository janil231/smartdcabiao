import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-mobile-nav">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-600">
              Terms and conditions for using SMARTDCABIAO tourism platform
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: February 8, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using SMARTDCABIAO, the official tourism platform of the Municipality of Cabiao, 
                Nueva Ecija, you accept and agree to be bound by these Terms of Service. If you do not agree to these 
                terms, please do not use this platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Platform Purpose</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is a municipal tourism platform designed to:
              </p>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li>• Promote local businesses and tourism in Cabiao</li>
                <li>• Provide information about destinations, events, and attractions</li>
                <li>• Facilitate community engagement through activities and rewards</li>
                <li>• Support the local economy and cultural preservation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">User Accounts and Authentication</h2>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Account Creation</h3>
                  <p className="text-blue-800 text-sm">
                    To access certain features, you must create an account using:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    <li>• Email and password</li>
                    <li>• Google Account (OAuth)</li>
                    <li>• Facebook Account (OAuth)</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">Account Responsibilities</h3>
                  <p className="text-yellow-800 text-sm">
                    You are responsible for:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                    <li>• Maintaining the confidentiality of your account credentials</li>
                    <li>• All activities under your account</li>
                    <li>• Providing accurate and up-to-date information</li>
                    <li>• Notifying us of unauthorized account use</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Content and Information</h2>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Business Information</h3>
                  <p className="text-green-800 text-sm">
                    Business listings and information are provided by local establishments and verified by the 
                    Municipal Tourism Office. However, we cannot guarantee the accuracy of all information.
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-medium text-orange-900 mb-2">User-Generated Content</h3>
                  <p className="text-orange-800 text-sm">
                    By using favorites, participation features, or other interactive elements, you agree not to:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-orange-800">
                    <li>• Post inappropriate, offensive, or illegal content</li>
                    <li>• Impersonate others or provide false information</li>
                    <li>• Violate any applicable laws or regulations</li>
                    <li>• Disrupt the normal functioning of the platform</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Map and Location Services</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Map Data Attribution</h3>
                <p className="text-gray-800 text-sm mb-2">
                  Our interactive maps are powered by:
                </p>
                <ul className="space-y-1 text-sm text-gray-800">
                  <li>• <strong>OpenStreetMap</strong> - Open source map data under ODbL</li>
                  <li>• <strong>Leaflet</strong> - Open source JavaScript mapping library</li>
                  <li>• <strong>Municipal Coordinates</strong> - Official Cabiao geographic data</li>
                </ul>
                <p className="mt-3 text-sm text-gray-700">
                  Map tiles are © OpenStreetMap contributors. Business locations are verified by the Municipal Tourism Office.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">LGU Verification and Authority</h2>
              <p className="text-gray-700 leading-relaxed">
                SMARTDCABIAO is the official tourism platform of the Municipality of Cabiao. 
                All business listings and tourism information are subject to municipal verification and approval.
              </p>
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Municipal Authority:</strong> This platform operates under the supervision of the 
                  Cabiao Municipal Tourism Office and complies with local tourism regulations and data privacy laws.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Rewards and Participation</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Our community rewards program encourages participation in local activities:
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900 mb-2">Terms for Rewards</h3>
                  <ul className="space-y-1 text-sm text-amber-800">
                    <li>• Points and vouchers are non-transferable</li>
                    <li>• Rewards are subject to availability and business participation</li>
                    <li>• The Municipal Tourism Office reserves the right to modify reward terms</li>
                    <li>• Fraudulent activity may result in account termination</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Prohibited Activities</h2>
              <p className="text-gray-700 leading-relaxed">You may not:</p>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li>• Use the platform for illegal or unauthorized purposes</li>
                <li>• Attempt to gain unauthorized access to our systems</li>
                <li>• Harvest or collect user information</li>
                <li>• Interfere with or disrupt the platform's functionality</li>
                <li>• Use automated tools to access the platform excessively</li>
                <li>• Violate intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Disclaimers and Limitations</h2>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-2">Important Disclaimers</h3>
                  <ul className="space-y-2 text-sm text-red-800">
                    <li>• <strong>Information Accuracy:</strong> We strive for accuracy but cannot guarantee all information is current or complete</li>
                    <li>• <strong>Business Operations:</strong> We are not responsible for business hours, services, or quality</li>
                    <li>• <strong>Event Cancellations:</strong> Events may be canceled or changed without notice</li>
                    <li>• <strong>Platform Availability:</strong> Service may be temporarily unavailable for maintenance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Privacy and Data Protection</h2>
              <p className="text-gray-700 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is governed by our 
                Privacy Policy, which forms part of these Terms. By using SMARTDCABIAO, you consent to such collection 
                and use in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Account Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these Terms of Service. 
                You may also request account deletion at any time through our Data Deletion process.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service are governed by the laws of the Republic of the Philippines and 
                local ordinances of the Municipality of Cabiao, Nueva Ecija.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update these Terms from time to time. Changes will be posted on this page with an 
                updated "Last updated" date. Continued use of the platform constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  For questions about these Terms of Service, please contact:
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
            to="/privacy" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Privacy Policy
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