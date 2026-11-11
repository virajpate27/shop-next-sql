// Print pages are private documents: keep them out of search engines.
export const metadata = {
  title: 'Print',
  robots: { index: false, follow: false },
}
export default function PrintLayout({ children }) { return children }