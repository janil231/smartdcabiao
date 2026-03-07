import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../services/adminRole.service'
import LoginModal from './Auth/LoginModal'
import SearchBar from './SearchBar'

const mainLinks = [
  { label: 'Home', to: '/' },
  { label: 'Map', to: '/map' },
  { label: 'Businesses', to: '/businesses' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Events', to: '/events' },
]

const moreLinks = [
  { label: 'Favorites', to: '/favorites' },
  { label: 'Rewards', to: '/rewards' },
  { label: 'Vouchers', to: '/vouchers' },
  { label: 'Suggest', to: '/suggest' },
]

function Dropdown({ isOpen, onClose, children }) {
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="py-1 bg-white rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function DropdownItem({ to, onClick, children, danger = false }) {
  const location = useLocation()
  const isActive = to && location.pathname === to

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`block px-4 py-2 text-sm ${
          danger 
            ? 'text-red-600 hover:bg-red-50' 
            : isActive 
              ? 'bg-emerald-50 text-emerald-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-sm ${
        danger 
          ? 'text-red-600 hover:bg-red-50' 
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminStatus = await isAdmin(user.uid)
        setIsUserAdmin(adminStatus)
      } else {
        setIsUserAdmin(false)
      }
    }
    checkAdmin()
  }, [user])

  const visibleMainLinks = mainLinks.filter(link => {
    if (link.adminOnly && !isUserAdmin) return false
    if (link.authOnly && !user) return false
    return true
  })

  const visibleMoreLinks = moreLinks.filter(link => {
    if (link.adminOnly && !isUserAdmin) return false
    if (link.authOnly && !user) return false
    return true
  })
  
  const isHomePage = location.pathname === '/'

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
  }

  return (
    <header className={`sticky top-0 z-50 w-full shadow-sm ${
      isHomePage 
        ? 'border-b border-white/10 bg-slate-900/55 backdrop-blur-lg' 
        : 'border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className={`flex items-center gap-2 text-lg font-bold tracking-tight shrink-0 ${
              isHomePage ? 'text-white' : 'text-emerald-700'
            }`}
          >
            <span className={`rounded px-2 py-0.5 ${
              isHomePage ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
            }`}>
              SMART
            </span>
            <span className="hidden sm:inline">DCABIAO</span>
          </Link>

          {/* Desktop search */}
          <div className="hidden lg:block flex-1 max-w-xs mx-4">
            <SearchBar placeholder="Search..." />
          </div>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Main links */}
            {visibleMainLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                  location.pathname === link.to
                    ? (isHomePage ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700')
                    : (isHomePage ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* More dropdown */}
            {visibleMoreLinks.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    isHomePage ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Dropdown isOpen={moreDropdownOpen} onClose={() => setMoreDropdownOpen(false)}>
                  {visibleMoreLinks.map((link) => (
                    <DropdownItem key={link.label} to={link.to}>
                      {link.label}
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
            )}

            {/* Divider */}
            <div className={`mx-2 h-6 w-px ${isHomePage ? 'bg-white/20' : 'bg-gray-200'}`} />

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    isHomePage ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isHomePage ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden xl:inline max-w-[120px] truncate">{user.email}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Dropdown isOpen={userMenuOpen} onClose={() => setUserMenuOpen(false)}>
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 truncate">
                    {user.email}
                  </div>
                  <DropdownItem to="/profile">
                    Profile
                  </DropdownItem>
                  {isUserAdmin && (
                    <DropdownItem to="/lgu">
                      Admin Dashboard
                    </DropdownItem>
                  )}
                  <DropdownItem to="/rewards">
                    My Rewards
                  </DropdownItem>
                  <div className="border-t border-gray-100 my-1" />
                  <DropdownItem onClick={handleLogout} danger>
                    Logout
                  </DropdownItem>
                </Dropdown>
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
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className={`lg:hidden inline-flex items-center justify-center rounded-lg p-2 transition shrink-0 ${
              isHomePage 
                ? 'text-white hover:bg-white/10' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`lg:hidden border-t px-4 py-4 ${
          isHomePage 
            ? 'border-white/10 bg-slate-900/90' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="mb-4">
            <SearchBar placeholder="Search businesses, destinations..." />
          </div>
          <ul className="flex flex-col gap-1">
            {[...mainLinks, ...moreLinks].map((link) => {
              if (link.adminOnly && !isUserAdmin) return null
              if (link.authOnly && !user) return null
              
              const isActive = location.pathname === link.to
              
              return (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? (isHomePage ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700')
                        : (isHomePage ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50')
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
            <li className="border-t border-white/10 my-2" />
            {user ? (
              <>
                <li>
                  <span className={`block px-3 py-2 text-xs truncate ${
                    isHomePage ? 'text-white/60' : 'text-gray-500'
                  }`}>{user.email}</span>
                </li>
                {isUserAdmin && (
                  <li>
                    <Link to="/lgu" className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isHomePage ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                      Admin Dashboard
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/profile" className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isHomePage ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isHomePage ? 'text-red-300 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setAuthModalOpen(true); }}
                  className={`block w-full rounded-lg px-3 py-2.5 text-center font-medium transition ${
                    isHomePage 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Login
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  )
}
