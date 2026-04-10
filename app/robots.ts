import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/profile/', '/orders/'],
      },
    ],
    sitemap: 'https://miksandchiks.com/sitemap.xml',
  };
}
