const COOKIE_NAME = 'sang_a_internal_session';
const SESSION_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

function timingSafeEqual(a, b) {
  const aa = encoder.encode(a);
  const bb = encoder.encode(b);
  const length = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < length; i += 1) diff |= (aa[i % aa.length] || 0) ^ (bb[i % bb.length] || 0);
  return diff === 0;
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/u, '');
}

async function validSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.split('=')[1];
  if (!value) return false;
  const [expires, signature] = value.split('.');
  if (!expires || Number(expires) < Date.now()) return false;
  return timingSafeEqual(signature || '', await sign(env.SESSION_SECRET, expires));
}

function loginPage(message = '') {
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>내부 테스트 로그인</title><style>body{font-family:system-ui;background:#07111f;color:#e5e7eb;display:grid;place-items:center;min-height:100vh;margin:0}.box{width:min(420px,88vw);padding:32px;background:#111c2d;border:1px solid #334155;border-radius:16px}input,button{box-sizing:border-box;width:100%;padding:12px;margin-top:12px;border-radius:8px}button{background:#2563eb;color:white;border:0;font-weight:700}.warn{color:#fbbf24}.error{color:#f87171}</style><form class="box" method="post" action="/_internal/login"><h1>내부 테스트</h1><p class="warn">승인된 담당자만 접속하세요. 실데이터를 개인 기기에 저장하지 마세요.</p>${message ? `<p class="error">${message}</p>` : ''}<label>팀 공통 암호<input type="password" name="password" required autocomplete="current-password"></label><button>접속</button></form></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function securityHeaders(response) {
  const next = new Response(response.body, response);
  next.headers.set('X-Content-Type-Options', 'nosniff');
  next.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next.headers.set('X-Frame-Options', 'DENY');
  next.headers.set('Cache-Control', response.headers.get('Content-Type')?.includes('text/html') ? 'no-store' : 'public, max-age=600');
  return next;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.TEAM_PASSWORD || !env.SESSION_SECRET || !env.ORIGIN_HOST) return new Response('Edge auth is not configured.', { status: 503 });
    if (url.pathname === '/_internal/logout') {
      return new Response(null, { status: 302, headers: { Location: '/', 'Set-Cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict` } });
    }
    if (url.pathname === '/_internal/login' && request.method === 'POST') {
      const form = await request.formData();
      if (!timingSafeEqual(String(form.get('password') || ''), env.TEAM_PASSWORD)) return loginPage('암호가 올바르지 않습니다.');
      const expires = String(Date.now() + SESSION_SECONDS * 1000);
      const signature = await sign(env.SESSION_SECRET, expires);
      return new Response(null, { status: 302, headers: { Location: '/', 'Set-Cookie': `${COOKIE_NAME}=${expires}.${signature}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict` } });
    }
    if (!(await validSession(request, env))) return loginPage();
    const origin = new URL(request.url);
    origin.hostname = env.ORIGIN_HOST;
    origin.protocol = 'https:';
    origin.pathname = `${env.ORIGIN_PATH_PREFIX || ''}${origin.pathname}`.replace(/\/+/gu, '/');
    const headers = new Headers(request.headers);
    headers.set('Host', env.ORIGIN_HOST);
    return securityHeaders(await fetch(new Request(origin, { method: request.method, headers, body: request.body, redirect: 'manual' })));
  }
};
