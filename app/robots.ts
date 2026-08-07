import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://microstay.us';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/vendor/dashboard',
          '/vendor/bookings',
          '/vendor/slots',
          '/vendor/analytics',
          '/vendor/financials',
          '/vendor/billing',
          '/vendor/team',
          '/vendor/properties',
          '/vendor/photos',
          '/vendor/messages',
          '/vendor/reviews',
          '/vendor/calendar',
          '/vendor/onboarding',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
