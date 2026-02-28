import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from './Auth/LoginModal'
import SearchBar from './SearchBar'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Map', to: '/map' },
  { label: 'Businesses', to: '/businesses' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Favorites', to: '/favorites' },
  { label: 'Events', to: '/events' },
  { label: 'Rewards', to: '/rewards' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()
  
  const isHomePage = location.pathname === '/'

  return (
    <header className={`sticky top-0 z-50 w-full shadow-sm ${
      isHomePage 
        ? 'border-b border-white/10 bg-slate-900/55 backdrop-blur-lg' 
        : 'border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80'
    }`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={`flex items-center gap-2 text-xl font-bold tracking-tight ${
            isHomePage ? 'text-white' : 'text-emerald-700'
          }`}
        >
          <span className={`rounded px-2 py-0.5 ${
            isHomePage ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
          }`}>
            SMART
          </span>
          <span>DCABIAO</span>
        </Link>

        {/* Desktop search */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <SearchBar placeholder="Search businesses, destinations..." />
        </div>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              {link.to ? (
                <Link
                  to={link.to}
                  className={`text-sm font-medium transition ${
                    isHomePage 
                      ? 'text-white hover:text-emerald-200' 
                      : 'hover:text-emerald-600'
                  } ${
                    location.pathname === link.to 
                      ? (isHomePage ? 'text-emerald-200' : 'text-emerald-600') 
                      : (isHomePage ? 'text-white' : 'text-gray-600')
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  className={`text-sm font-medium transition ${
                    isHomePage ? 'text-white hover:text-emerald-200' : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
          <li>
            {user ? (
              <div className="flex items-center gap-3">
                <span className={`text-sm truncate max-w-[140px] ${
                  isHomePage ? 'text-white' : 'text-gray-600'
                }`} title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    isHomePage 
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isHomePage 
                    ? 'bg-white/20 text-white hover:bg-white/30' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                Login
              </button>
            )}
          </li>
        </ul>

        {/* Mobile menu button */}
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-lg p-2 transition md:hidden ${
            isHomePage 
              ? 'text-white hover:bg-white/10' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`border-t px-4 py-4 md:hidden ${
          isHomePage 
            ? 'border-white/10 bg-white/10 backdrop-blur-md' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="mb-4">
            <SearchBar placeholder="Search businesses, destinations..." />
          </div>
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.label}>
                {link.to ? (
                  <Link
                    to={link.to}
                    className={`block rounded-lg px-3 py-2 transition ${
                      isHomePage 
                        ? 'text-white hover:bg-white/10 hover:text-emerald-200' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 transition ${
                      isHomePage 
                        ? 'text-white hover:bg-white/10 hover:text-emerald-200' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
            <li>
              {user ? (
                <div className="flex flex-col gap-2">
                  <span className={`px-3 py-2 text-sm truncate ${
                    isHomePage ? 'text-white' : 'text-gray-600'
                  }`}>{user.email}</span>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className={`rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                     isHomePage 
                       ? 'border-white/20 bg-white/10 text-white' 
                       : 'border-gray-300 bg-white text-gray-700'
                   }`}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setAuthModalOpen(true); }}
                  className={`block w-full rounded-lg px-3 py-2 text-center font-medium transition ${
                    isHomePage 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Login
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  )
}
