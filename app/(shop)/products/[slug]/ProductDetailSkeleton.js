// src/app/(shop)/products/[slug]/ProductDetailSkeleton.js
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-3 bg-gray-100 rounded w-10" />
        <div className="h-3 bg-gray-100 rounded w-3" />
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-3" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Image */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl mb-4" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-8 bg-gray-100 rounded w-3/4" />
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-24 bg-gray-100 rounded" />
          <div className="flex gap-3">
            <div className="h-12 bg-gray-100 rounded-xl w-32" />
            <div className="h-12 bg-gray-100 rounded-xl flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
