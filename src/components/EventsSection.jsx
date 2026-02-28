import { Link } from 'react-router-dom'

export default function EventsSection() {
  return (
    <section id="events" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Community Activities
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Clean-up drives, tree planting, and local events in Cabiao. Join activities and help improve the municipality.
          </p>
          <Link
            to="/events"
            className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            View all activities
          </Link>
        </div>
      </div>
    </section>
  )
}
