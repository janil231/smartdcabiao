

const tips = [
  {
    id: 1,
    title: 'Support Local Businesses',
    description: 'Choose locally-owned restaurants, shops, and services to keep money within the community and preserve Cabiao\'s unique character.',
    icon: '🏪',
    color: 'bg-blue-500'
  },
  {
    id: 2,
    title: 'Respect Cultural Heritage',
    description: 'Be mindful of local customs and traditions. Ask permission before taking photos of people or private property.',
    icon: '🙏',
    color: 'bg-purple-500'
  },
  {
    id: 3,
    title: 'Reduce Waste',
    description: 'Bring reusable water bottles and bags. Dispose of waste properly and participate in local recycling programs.',
    icon: '♻️',
    color: 'bg-green-500'
  },
  {
    id: 4,
    title: 'Use Sustainable Transport',
    description: 'Walk, bike, or use local transportation when possible to reduce your carbon footprint while exploring.',
    icon: '🚶',
    color: 'bg-emerald-500'
  },
  {
    id: 5,
    title: 'Conserve Natural Resources',
    description: 'Be mindful of water and energy usage. Stay in eco-friendly accommodations that prioritize sustainability.',
    icon: '💧',
    color: 'bg-cyan-500'
  },
  {
    id: 6,
    title: 'Engage with Community',
    description: 'Participate in local events and activities. Learn from residents about Cabiao\'s history and culture.',
    icon: '🤝',
    color: 'bg-orange-500'
  }
]

export default function SustainableTourismTips() {

  return (
    <section className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Sustainable Tourism in Cabiao
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Help preserve Cabiao's natural beauty and cultural heritage. Every small action makes a difference in creating a sustainable future for our community.
          </p>
        </div>

        {/* Main Tips Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className={`inline-flex p-3 rounded-lg ${tip.color} text-white mb-4`}>
                  <span className="text-2xl">{tip.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition">
                  {tip.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {tip.description}
                </p>
              </div>
              
              {/* Decorative bottom accent */}
              <div className={`h-1 ${tip.color} opacity-20 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-emerald-100">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Be a Responsible Tourist
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Your choices matter. By practicing sustainable tourism, you help ensure that Cabiao remains beautiful and vibrant for future generations while supporting our local economy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Join Community Activities
            </a>
            <a
              href="/businesses"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Support Local Businesses
            </a>
          </div>
        </div>

        {/* Impact Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">85%</div>
            <div className="text-sm text-gray-600">Local economic boost from tourism</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">50%</div>
            <div className="text-sm text-gray-600">Reduction in waste through recycling</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">100+</div>
            <div className="text-sm text-gray-600">Local businesses supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">24/7</div>
            <div className="text-sm text-gray-600">Community engagement opportunities</div>
          </div>
        </div>
      </div>
    </section>
  )
}