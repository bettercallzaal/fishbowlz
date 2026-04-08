import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🐟</div>
        <h1 className="text-3xl font-bold text-[#f5a623] mb-2">404</h1>
        <p className="text-gray-400 mb-6">
          This fishbowl does not exist. It may have been removed or the link is incorrect.
        </p>
        <Link
          href="/fishbowlz"
          className="inline-block bg-[#f5a623] text-[#0a1628] font-semibold px-6 py-3 rounded-lg hover:bg-[#d4941f] transition-colors"
        >
          Browse Rooms
        </Link>
      </div>
    </div>
  );
}
