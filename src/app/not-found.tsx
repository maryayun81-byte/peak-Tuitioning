import Link from 'next/link'

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <h1 className="text-6xl font-black text-slate-200">404</h1>
        <h2 className="text-2xl font-black text-slate-900">Page Not Found</h2>
        <p className="text-slate-500 font-medium">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
