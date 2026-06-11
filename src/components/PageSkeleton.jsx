export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  )
}
