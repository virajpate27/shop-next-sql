// components/layout/PolicyPage.js — shared layout for policy / help pages (server component, no JS shipped)
export default function PolicyPage({ title, intro, updated, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {updated && <p className="text-sm text-gray-400 mb-6">Last updated: {updated}</p>}
      {intro && <p className="text-gray-600 leading-relaxed mb-8">{intro}</p>}
      <div className="space-y-8">{children}</div>
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2 text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}