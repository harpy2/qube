/**
 * QUBE API Worker
 * - Cron: 1분마다 adbc CPQ 캠페인 동기화 → KV 저장
 * - API: 게임 프론트엔드용 엔드포인트
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ─── CPQ 캠페인 동기화 ───

async function syncCampaigns(env) {
  const url = `${env.ADBC_API_URL}?token=${env.ADBC_TOKEN}&level=2`;
  const res = await fetch(url, { headers: { 'User-Agent': 'QUBE-Sync/1.0' } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  const camps = data.camp || [];

  // CPQ 필터: detail_type이 cpc_detail로 시작
  const cpqCamps = camps.filter(c => (c.detail_type || '').startsWith('cpc_detail'));

  // 게임에서 쓸 필드만 추출
  const cleaned = cpqCamps.map(c => ({
    id: c.campid,
    name: c.name,
    type: c.detail_type,           // cpc_detail_place | cpc_detail_place_quiz
    price: c.price,
    reward_desc: c.rewarddesc,
    join_desc: c.joindesc,
    random_desc: c.randomdesc,
    search_keyword: c.search_keyword,
    answer: c.ad_event_name,        // 정답 (걸음 수)
    icon: c.iconurl,
    images: (c.ctv || []).map(i => i.url).filter(Boolean),
    url: c.url,
    quantity: c.quantity,
    end_date: c.enddate,
  }));

  // KV에 저장
  await env.QUBE_KV.put('cpq_campaigns', JSON.stringify(cleaned), {
    metadata: { synced_at: new Date().toISOString(), count: cleaned.length },
  });

  return { synced: cleaned.length, total: camps.length };
}

// ─── API 라우터 ───

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // GET /api/campaigns — CPQ 캠페인 목록 (정답 제외)
  if (path === '/api/campaigns' && request.method === 'GET') {
    const raw = await env.QUBE_KV.get('cpq_campaigns');
    if (!raw) return jsonResponse({ error: 'No data yet' }, 503);

    const camps = JSON.parse(raw);
    // 정답 제외한 목록 반환
    const safe = camps.map(({ answer, ...rest }) => rest);
    return jsonResponse({ count: safe.length, campaigns: safe });
  }

  // GET /api/campaigns/:id — 단일 캠페인 (정답 제외)
  if (path.match(/^\/api\/campaigns\/\d+$/) && request.method === 'GET') {
    const id = parseInt(path.split('/').pop());
    const raw = await env.QUBE_KV.get('cpq_campaigns');
    if (!raw) return jsonResponse({ error: 'No data yet' }, 503);
    const camp = JSON.parse(raw).find(c => c.id === id);
    if (!camp) return jsonResponse({ error: 'Campaign not found' }, 404);
    const { answer, ...safe } = camp;
    return jsonResponse(safe);
  }

  // POST /api/verify — 정답 확인
  if (path === '/api/verify' && request.method === 'POST') {
    const body = await request.json();
    const { campaign_id, user_answer } = body;
    if (!campaign_id || !user_answer) {
      return jsonResponse({ error: 'campaign_id and user_answer required' }, 400);
    }
    const raw = await env.QUBE_KV.get('cpq_campaigns');
    if (!raw) return jsonResponse({ error: 'No data yet' }, 503);
    const camp = JSON.parse(raw).find(c => c.id === campaign_id);
    if (!camp) return jsonResponse({ error: 'Campaign not found' }, 404);
    const correct = String(camp.answer).trim() === String(user_answer).trim();
    return jsonResponse({ correct, campaign_id });
  }

  // GET /api/random — 랜덤 CPQ 캠페인 (게임용, 정답 제외)
  if (path === '/api/random' && request.method === 'GET') {
    const count = parseInt(url.searchParams.get('count') || '1');
    const raw = await env.QUBE_KV.get('cpq_campaigns');
    if (!raw) return jsonResponse({ error: 'No data yet' }, 503);

    const camps = JSON.parse(raw);
    // 셔플 후 count개 선택
    const shuffled = camps.sort(() => Math.random() - 0.5).slice(0, Math.min(count, 10));
    const safe = shuffled.map(({ answer, ...rest }) => rest);
    return jsonResponse({ campaigns: safe });
  }

  // POST /api/cpq-story — CPQ 퍼즐 스토리 AI 생성
  if (path === '/api/cpq-story' && request.method === 'POST') {
    const body = await request.json();
    const { theme, room_name, campaign } = body;

    if (!theme || !campaign) {
      return jsonResponse({ error: 'theme and campaign required' }, 400);
    }

    const keyword = campaign.search_keyword || '';
    const desc = campaign.join_desc || '';
    const placeMatch = desc.match(/\[([^\]]*X[^\]]*)\]/);
    const placeHint = placeMatch ? placeMatch[1] : '해당 장소';
    const startMatch = desc.match(/출발지를\s*\[([^\]]+)\]/);
    const startPlace = startMatch ? startMatch[1] : '지정된 출발지';

    const prompt = `당신은 방탈출 게임 시나리오 작가입니다.

아래 정보를 바탕으로 방탈출 게임의 마지막 퍼즐(CPQ 미션) 스토리를 작성해주세요.

[방 정보]
- 방 이름: ${room_name || '미스터리 방'}
- 테마: ${theme}

[CPQ 미션 정보]
- 검색 키워드: ${keyword}
- 장소 힌트: ${placeHint}
- 출발지: ${startPlace}

[요구사항]
1. "story": 이 장소를 왜 조사해야 하는지 스토리 맥락 (3~5문장, 방 테마에 자연스럽게 녹여서)
2. "storyAfter": 걸음 수를 확인한 후 이어지는 스토리 (2~3문장, 단서가 맞아떨어지는 느낌)
3. "title": 퍼즐 제목 (예: "🔍 퍼즐 5: 마지막 단서")

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{"story":"...","storyAfter":"...","title":"..."}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return jsonResponse({ error: 'AI generation failed', detail: err }, 502);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch[0]);
      return jsonResponse({
        ...result,
        campaign_id: campaign.id,
        search_keyword: keyword,
        place_hint: placeHint,
        start_place: startPlace,
      });
    } catch {
      return jsonResponse({ error: 'Failed to parse AI response', raw: text }, 500);
    }
  }

  // POST /api/sync — 수동 동기화
  if (path === '/api/sync' && request.method === 'POST') {
    const result = await syncCampaigns(env);
    return jsonResponse(result);
  }

  // GET /api/status — 동기화 상태
  if (path === '/api/status') {
    const { value, metadata } = await env.QUBE_KV.getWithMetadata('cpq_campaigns');
    return jsonResponse({
      synced: !!value,
      ...(metadata || {}),
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ─── Export ───

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    try {
      const result = await syncCampaigns(env);
      console.log(`[QUBE Sync] ${result.synced} CPQ campaigns synced (total: ${result.total})`);
    } catch (e) {
      console.error(`[QUBE Sync Error] ${e.message}`);
    }
  },
};
