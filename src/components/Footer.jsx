import { Link } from 'react-router-dom'

const currentYear = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Municipality
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              Municipality of Cabiao
              <br />
              Nueva Ecija, Philippines
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Contact
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>
                Municipal Hall, Cabiao
                <br />
                Nueva Ecija
              </p>
              <p className="mt-2">
                Email: tourism@cabiao.gov.ph
                <br />
                Phone: (044) 567-8901
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Tourism
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>Discover local businesses, events, and attractions in Cabiao.</p>
<div className="mt-3 space-y-1">
              <Link 
                to="/about" 
                className="block text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                About SMARTDCABIAO
              </Link>
              <Link 
                to="/suggest" 
                className="block text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Suggest a Place
              </Link>
            </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Legal
            </h3>
            <div className="mt-2 space-y-1">
              <Link 
                to="/privacy" 
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                Terms of Service
              </Link>
              <Link 
                to="/data-deletion" 
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                Data Deletion
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          &copy; {currentYear} SMARTDCABIAO. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
