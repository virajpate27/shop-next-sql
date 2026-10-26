// src/components/ui/Skeletons.js
export function TextSkeleton({ className = '' }) {
    return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />
  }
  
  export function AvatarSkeleton({ size = 10 }) {
    return (
      <div
        className="bg-gray-100 rounded-full animate-pulse flex-shrink-0"
        style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      />
    )
  }
  
  export function CardSkeleton() {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    )
  }
  
  export function TableRowSkeleton({ cols = 5 }) {
    return (
      <tr className="animate-pulse">
        {Array.from({ length: cols }).map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div className="h-4 bg-gray-100 rounded" />
          </td>
        ))}
      </tr>
    )
  }
  
  export function OrderCardSkeleton() {
    return (
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 bg-gray-100 rounded-full w-20" />
          <div className="h-5 bg-gray-100 rounded w-16" />
        </div>
      </div>
    )
  }