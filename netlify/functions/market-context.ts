import type { Config, Context } from '@netlify/functions';

export default async (_request: Request, context: Context) => {
  const country = context.geo?.country;
  return new Response(JSON.stringify({
    countryCode: country?.code || null,
    countryName: country?.name || null,
    timezone: context.geo?.timezone || null,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });
};

export const config: Config = {
  path: '/.netlify/functions/market-context',
};
