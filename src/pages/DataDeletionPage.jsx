import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-20 md:pb-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Data Deletion Request</h1>
            <p className="text-gray-600">
              How to request deletion of your personal data from SMARTDCABIAO
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: February 8, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Data Rights</h2>
              <p className="text-gray-700 leading-relaxed">
                Under the Data Privacy Act of 2012 and our privacy policy, you have the right to request 
                the deletion of your personal data from SMARTDCABIAO. This page explains how to exercise that right.
              </p>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  <strong>What happens when you request deletion:</strong> We will permanently remove your account 
                  and all associated personal information from our systems within 30 days of your verified request.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Data That Will Be Deleted</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Authentication Data</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Email address and display name</li>
                    <li>• Profile photo (if connected to Google/Facebook)</li>
                    <li>• Authentication tokens and session data</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">App Activity Data</h3>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• Saved favorites (businesses, destinations)</li>
                    <li>• Community activity participation records</li>
                    <li>• Earned points and reward vouchers</li>
                    <li>• App usage analytics tied to your account</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">What Remains After Deletion</h3>
                  <ul className="space-y-1 text-sm text-gray-800">
                    <li>• Anonymized usage statistics (no personal identifiers)</li>
                    <li>• Business directory listings (public information)</li>
                    <li>• Municipal records required by law (if applicable)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Request Data Deletion</h2>
              
              <div className="space-y-6">
                {/* Method 1: Email Request */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">1</div>
                    <h3 className="ml-3 text-lg font-medium text-gray-900">Email Request</h3>
                  </div>
                  
                  <div className="ml-11 space-y-4">
                    <p className="text-gray-700">Send an email to our Municipal Tourism Office:</p>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium text-gray-900">Email: tourism@cabiao.gov.ph</p>
                      <p className="text-sm text-gray-600 mt-1">Subject: Data Deletion Request - SMARTDCABIAO</p>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm font-medium mb-2">Required Information:</p>
                      <ul className="space-y-1 text-sm text-yellow-800">
                        <li>• Full name</li>
                        <li>• Email address used for your account</li>
                        <li>• Phone number (if available)</li>
                        <li>• Statement confirming identity and deletion request</li>
                        <li>• Preferred date of deletion (optional)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Method 2: In-Person Request */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">2</div>
                    <h3 className="ml-3 text-lg font-medium text-gray-900">In-Person Request</h3>
                  </div>
                  
                  <div className="ml-11 space-y-4">
                    <p className="text-gray-700">Visit the Municipal Tourism Office:</p>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium text-gray-900">Address: Municipal Hall, Cabiao, Nueva Ecija</p>
                      <p className="text-sm text-gray-600 mt-1">Hours: Monday - Friday, 8:00 AM - 5:00 PM</p>
                      <p className="text-sm text-gray-600">Phone: (044) 567-8901</p>
                    </div>
                    
                    <p className="text-gray-700">
                      Bring a valid government ID and be prepared to provide the same information as email requests.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Identity Verification</h2>
              <p className="text-gray-700 leading-relaxed">
                To protect your privacy, we must verify your identity before processing deletion requests. 
                We may contact you using the email or phone number associated with your account to confirm your request.
              </p>
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 text-sm">
                  <strong>Important:</strong> We will never ask for your password or financial information during the verification process.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">OAuth Provider Considerations</h2>
              <p className="text-gray-700 leading-relaxed">
                If you created your account using Google or Facebook, please note:
              </p>
              
              <div className="mt-4 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Google Account</h3>
                  <p className="text-blue-800 text-sm">
                    Deleting your SMARTDCABIAO account does not delete your Google account. 
                    You may need to revoke app permissions in your Google Account settings.
                  </p>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-medium text-indigo-900 mb-2">Facebook Account</h3>
                  <p className="text-indigo-800 text-sm">
                    Deleting your SMARTDCABIAO account does not delete your Facebook account. 
                    You can manage app permissions in your Facebook Settings.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Processing Timeline</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      <strong>Within 24 hours:</strong> We send confirmation of your request
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      <strong>Within 7 days:</strong> Identity verification completed
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      <strong>Within 30 days:</strong> All personal data permanently deleted
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Before You Request Deletion</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm">
                  <strong>Consider this before proceeding:</strong> Once your data is deleted, it cannot be recovered. 
                  You will lose:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  <li>• All saved favorites and preferences</li>
                  <li>• Earned points and reward vouchers</li>
                  <li>• Participation history in community activities</li>
                  <li>• Account access to tourism features</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Alternative: Account Deactivation</h2>
              <p className="text-gray-700 leading-relaxed">
                If you're not ready for permanent deletion but want to stop using the platform, you can:
              </p>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li>• Clear your favorites from your account settings</li>
                <li>• Revoke app permissions in your OAuth provider settings</li>
                <li>• Simply stop using the platform (your data remains for future use)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Questions or Concerns</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  If you have questions about data deletion or your privacy rights, contact our Data Privacy Officer:
                </p>
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-gray-900">Data Privacy Officer</p>
                  <p className="text-sm text-gray-600">
                    Email: dpo@cabiao.gov.ph<br />
                    Phone: (044) 567-8902<br />
                    Address: Municipal Hall, Cabiao, Nueva Ecija
                  </p>
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