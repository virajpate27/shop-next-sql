// src/app/robots.js
export default function robots() {
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin/', '/api/', '/checkout/', '/orders/', '/profile/'],
        },
      ],
      sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
    }
  }