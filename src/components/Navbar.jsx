import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  { label: 'Suggest', to: '/suggest-destination' },
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
    <div
      ref={dropdownRef}
      className="absolute right-0 z-[1100] mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black/5"
    >
      <div className="py-1 rounded-lg overflow-hidden">
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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    if (location.state?.openLogin) {
      setAuthModalOpen(true)
    }
  }, [location.state?.openLogin])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
    setMenuOpen(false)
    logout()
  }

  const closeMenu = () => setMenuOpen(false)

  const mobileDrawer =
    menuOpen &&
    createPortal(
      <div className="lg:hidden fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div
          className="absolute inset-0 bg-black/60"
          onClick={closeMenu}
          aria-hidden
        />
        <div className="absolute top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
            <span className="font-bold text-lg text-emerald-700">Menu</span>
            <button
              type="button"
              onClick={closeMenu}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {user && (
            <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <p className="text-xs text-gray-500 mb-1">Signed in as</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
            </div>
          )}

          <nav className="flex-1 min-h-0 overflow-y-auto p-2">
            {[...visibleMainLinks, ...visibleMoreLinks].map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-800 min-h-[44px] transition ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

            <div className="h-px bg-gray-200 my-2 mx-2" />

            <Link
              to="/register-business"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-emerald-700 min-h-[44px] hover:bg-emerald-50"
            >
              List My Business
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-800 min-h-[44px] hover:bg-emerald-50"
                >
                  My Profile
                </Link>
                {isUserAdmin && (
                  <Link
                    to="/lgu"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-emerald-700 min-h-[44px] hover:bg-emerald-50"
                  >
                    LGU Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 min-h-[44px] hover:bg-red-50 text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  setAuthModalOpen(true)
                }}
                className="w-[calc(100%-1rem)] mx-2 flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold min-h-[44px] hover:bg-emerald-700"
              >
                Sign In
              </button>
            )}
          </nav>

          <div className="p-4 border-t border-gray-200 shrink-0">
            <SearchBar placeholder="Search..." />
            <p className="text-xs text-gray-400 text-center mt-3">SMARTDCABIAO</p>
          </div>
        </div>
      </div>,
      document.body
    )

  return (
    <>
    <header className={`sticky top-0 z-[1100] w-full transition-shadow duration-200 ${
      isHomePage 
        ? `border-b border-white/10 bg-slate-900/55 backdrop-blur-lg ${scrolled ? 'shadow-md' : 'shadow-none'}` 
        : `border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 ${scrolled ? 'shadow-md' : 'shadow-none'}`
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold tracking-tight shrink-0 min-w-0 ${
              isHomePage ? 'text-white' : 'text-emerald-700'
            }`}
          >
            <span className={`rounded px-2 py-0.5 text-sm sm:text-base ${
              isHomePage ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
            }`}>
              SMART
            </span>
            <span className="hidden min-[400px]:inline truncate">DCABIAO</span>
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
            className={`lg:hidden inline-flex items-center justify-center rounded-lg min-w-11 min-h-11 transition shrink-0 ${
              isHomePage
                ? 'text-white hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>
      </div>

      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
    {mobileDrawer}
    </>
  )
}
