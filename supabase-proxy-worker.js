// Cloudflare Worker - Supabase 代理
// 部署到 Cloudflare Workers（免费）

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 只允许特定域名调用（改成你自己的）
    const allowedOrigins = [
      'https://ni-six-psi.vercel.app',
      'http://localhost:3000',
      'https://dalanying.work',
      'https://www.dalanying.work'
    ];
    
    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 转发到 Supabase
    const supabaseUrl = 'https://aawoajhmhvysedabncoz.supabase.co';
    const targetUrl = supabaseUrl + url.pathname + url.search;
    
    const headers = new Headers();
    for (const [key, value] of request.headers) {
      if (!['host', 'cf-connecting-ip', 'cf-ray', 'x-forwarded-for', 'x-real-ip'].includes(key)) {
        headers.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
    });

    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newResponse.headers.set(key, value);
    }
    
    return newResponse;
  }
};
