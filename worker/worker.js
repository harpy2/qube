// QUBE API Worker — CPQ 방탈출 게임
// Secrets: ANTHROPIC_API_KEY, ADBC_TOKEN

// 일반 퍼즐 풀 (AI 없이 바로 쓸 수 있는 것들)
const GENERAL_PUZZLES = [
  { type: "cipher", question: "다음 암호를 해독하세요: TFDSFUB → 각 글자를 알파벳 한 칸 앞으로", answer: "SECRETA", hint: "시저 암호입니다. 각 글자를 한 칸씩 앞으로 옮겨보세요." },
  { type: "math", question: "3 × 7 + 9 ÷ 3 - 4 = ?", answer: "20", hint: "연산 순서를 잘 생각하세요." },
  { type: "cipher", question: "거꾸로 읽으세요: 다밀비 의실방 은호번", answer: "번호는 방실의 비밀다", hint: "오른쪽에서 왼쪽으로 읽어보세요." },
  { type: "math", question: "1, 1, 2, 3, 5, 8, ? 다음 수는?", answer: "13", hint: "앞의 두 수를 더하면 다음 수가 됩니다." },
  { type: "cipher", question: "모스 부호: ·· ···· ·- ···- · 숫자로 변환하면?", answer: "13", hint: "모스 부호에서 점의 개수를 세어보세요." },
  { type: "logic", question: "성냥 6개로 정삼각형 4개를 만들 수 있는 방법은? 힌트: 평면이 아닙니다. 답: OO체", answer: "정사면체", hint: "3차원으로 생각하세요. 피라미드 모양입니다." },
  { type: "math", question: "시계가 3시를 가리키면 시침과 분침의 각도는?", answer: "90", hint: "시계 한 바퀴는 360도, 12시간으로 나누면..." },
  { type: "cipher", question: "A=1, B=2, C=3... 으로 변환: 8-5-12-16 → ?", answer: "HELP", hint: "각 숫자를 알파벳으로 바꾸세요." },
  { type: "logic", question: "엘리베이터에 사람이 6명 탔다. 2층에서 2명 내리고 3명 탔다. 3층에서 1명 내리고 2명 탔다. 지금 엘리베이터에 몇 명?", answer: "8", hint: "6 - 2 + 3 - 1 + 2 = ?" },
  { type: "math", question: "2, 6, 12, 20, 30, ? 다음 수는?", answer: "42", hint: "차이를 보세요: 4, 6, 8, 10, ?" },
];

// 스토리 템플릿
const STORY_TEMPLATES = [
  {
    id: "professor",
    title: "사라진 교수의 서재",
    emoji: "🏚️",
    intro: "대학 고고학과 교수가 3일째 연락이 두절됐다. 그의 서재에 들어왔지만 문이 잠겨버렸다. 책상 위에는 해독되지 않은 암호와 최근 주문한 택배 영수증이 흩어져 있다. 단서를 모아 탈출하고, 교수의 행방을 밝혀라.",
    cpq_bridge: "서랍 속에서 교수의 최근 검색 기록이 적힌 메모를 발견했다. 교수가 마지막으로 검색한 것을 따라가면 단서를 찾을 수 있을지도 모른다.",
    cpq_bridge2: "금고 안에서 또 다른 메모가 나왔다. 교수는 사라지기 전 다른 것도 검색했던 것 같다.",
    difficulty: 1
  },
  {
    id: "ship",
    title: "표류된 화물선",
    emoji: "🚢",
    intro: "알 수 없는 조난 신호를 받고 도착한 무인 화물선. 승무원은 모두 사라졌고, 선장실 문은 잠겨있다. 화물 목록과 항해 일지를 조사해서 진실을 밝혀라. 빠져나갈 방법도 찾아야 한다.",
    cpq_bridge: "화물 목록 중 이상한 항목이 있다. 이 화물의 정체를 알면 선장실 비밀번호를 알 수 있을 것 같다. 네이버에서 검색해서 확인해보자.",
    cpq_bridge2: "항해 일지에 또 다른 수상한 화물이 기록되어 있다. 이것도 확인해봐야 한다.",
    difficulty: 2
  },
  {
    id: "hotel",
    title: "호텔 미스터리",
    emoji: "🏨",
    intro: "고급 호텔 1204호에서 투숙객이 사라졌다. 경찰이 오기 전, 당신은 이 방에서 단서를 찾아야 한다. 사라진 투숙객의 쇼핑백과 메모가 방 곳곳에 흩어져 있다.",
    cpq_bridge: "침대 밑에서 투숙객의 쇼핑 메모를 발견했다. 이 사람이 무엇을 찾고 있었는지 알면 실종의 단서가 될 수 있다.",
    cpq_bridge2: "욕실 거울 뒤에서 또 다른 메모가 나왔다. 투숙객은 여러 곳을 조사하고 있었던 것 같다.",
    difficulty: 2
  },
  {
    id: "detective",
    title: "탐정 사무소",
    emoji: "🕵️",
    intro: "의문의 의뢰인이 남긴 봉투 하나. 안에는 사진 한 장과 주소가 적혀있다. 의뢰인은 사라졌고, 사무소 문도 잠겼다. 의뢰인이 남긴 단서들을 추적해 진실을 밝혀라.",
    cpq_bridge: "봉투 안에 의뢰인의 검색 기록 스크린샷이 있었다. 의뢰인이 무엇을 조사하고 있었는지 직접 검색해서 확인해보자.",
    cpq_bridge2: "사진 뒷면에 또 다른 검색 키워드가 적혀있다. 이것도 따라가봐야 한다.",
    difficulty: 3
  },
  {
    id: "hospital",
    title: "폐병원 탈출",
    emoji: "🏥",
    intro: "도시 외곽의 폐병원. 탐험 영상을 찍으러 들어왔지만 입구가 무너져 막혔다. 비상구를 찾아야 한다. 병원 곳곳에 남아있는 기록들이 탈출의 열쇠가 될 수 있다.",
    cpq_bridge: "간호사 스테이션에서 환자 기록부를 발견했다. 마지막 환자의 기록에 이상한 메모가 있다. 여기 적힌 것을 검색해보면 비상구 비밀번호를 알 수 있을 것 같다.",
    cpq_bridge2: "지하 창고에서 의약품 주문 기록을 발견했다. 이것도 비밀번호의 일부인 것 같다.",
    difficulty: 3
  }
];

function corsHeaders(origin, allowedOrigin) {
  const allowed = allowedOrigin === '*' || origin === allowedOrigin || origin === 'http://localhost:3500' || origin === 'http://localhost:3400';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

async function callClaude(apiKey, systemPrompt, userMessage, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    const data = await resp.json();
    if (data.content && data.content[0]) return data.content[0].text;
    if (data.error && data.error.type === 'overloaded_error' && i < retries - 1) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      continue;
    }
    throw new Error('Claude API error: ' + JSON.stringify(data));
  }
}

// adbc에서 CPQ 캠페인 가져오기
async function fetchCPQCampaigns(adbc_url, token) {
  const url = `${adbc_url}?token=${token}&level=2&detail_type=cpc_detail_place`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.camp) return [];
  
  // 활성 캠페인만 (수량 > 0, 종료일 > 오늘)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return data.camp.filter(c => 
    c.quantity > 0 && 
    c.enddate > today &&
    c.search_keyword && c.search_keyword.trim() !== '' &&
    c.ad_event_name && c.ad_event_name.trim() !== ''
  );
}

// 캠페인 2개씩 묶어서 방 목록 생성
function buildRooms(campaigns) {
  const rooms = [];
  const shuffled = [...campaigns].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(shuffled.length, 20); i += 2) {
    const cpq1 = shuffled[i];
    const cpq2 = shuffled[i + 1] || null;
    const template = STORY_TEMPLATES[Math.floor(Math.random() * STORY_TEMPLATES.length)];
    
    rooms.push({
      id: `room-${cpq1.campid}${cpq2 ? '-' + cpq2.campid : ''}`,
      templateId: template.id,
      title: template.title,
      emoji: template.emoji,
      difficulty: template.difficulty,
      cpqCount: cpq2 ? 2 : 1,
      puzzleCount: cpq2 ? 4 : 3,
      campaigns: cpq2 ? [
        { campid: cpq1.campid, keyword: cpq1.search_keyword, answer: cpq1.ad_event_name, name: cpq1.name },
        { campid: cpq2.campid, keyword: cpq2.search_keyword, answer: cpq2.ad_event_name, name: cpq2.name }
      ] : [
        { campid: cpq1.campid, keyword: cpq1.search_keyword, answer: cpq1.ad_event_name, name: cpq1.name }
      ]
    });
  }
  return rooms;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN || '*');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // GET /api/rooms — 방 목록
    if (url.pathname === '/api/rooms' && request.method === 'GET') {
      try {
        const campaigns = await fetchCPQCampaigns(env.ADBC_API_URL, env.ADBC_TOKEN);
        const rooms = buildRooms(campaigns);
        
        // 클라이언트에는 정답 제외하고 보냄
        const safeRooms = rooms.map(r => ({
          id: r.id,
          title: r.title,
          emoji: r.emoji,
          difficulty: r.difficulty,
          cpqCount: r.cpqCount,
          puzzleCount: r.puzzleCount,
          templateId: r.templateId
        }));
        
        return new Response(JSON.stringify({ rooms: safeRooms }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
      }
    }

    // POST /api/room/generate — 방 생성 (스토리 + 퍼즐)
    if (url.pathname === '/api/room/generate' && request.method === 'POST') {
      const body = await request.json();
      const { roomId } = body;
      
      try {
        const campaigns = await fetchCPQCampaigns(env.ADBC_API_URL, env.ADBC_TOKEN);
        const rooms = buildRooms(campaigns);
        const room = rooms.find(r => r.id === roomId);
        
        if (!room) {
          return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers });
        }
        
        const template = STORY_TEMPLATES.find(t => t.id === room.templateId);
        
        // 일반 퍼즐 랜덤 선택
        const shuffledPuzzles = [...GENERAL_PUZZLES].sort(() => Math.random() - 0.5);
        const generalPuzzles = shuffledPuzzles.slice(0, 2);
        
        // AI로 CPQ 퍼즐 스토리 생성
        const cpqData = room.campaigns.map(c => `검색키워드: "${c.keyword}", 상점/상품명: "${c.name}"`).join('\n');
        
        const storyPrompt = `너는 방탈출 게임 시나리오 작가야.

아래 스토리 템플릿과 CPQ 미션 데이터를 사용해서 자연스러운 방탈출 퍼즐을 만들어줘.

## 스토리 템플릿
제목: ${template.title}
배경: ${template.intro}

## CPQ 미션 데이터 (네이버 검색 유도)
${cpqData}

## 규칙
1. 각 CPQ 미션을 스토리에 자연스럽게 녹여라
2. "네이버에서 [키워드]를 검색해서 [상점/상품]을 찾아 [특정 정보]를 확인하라" 형태로 유도
3. 검색 키워드를 자연스럽게 스토리에 포함시켜라 (강제적이지 않게)
4. 한국어로 작성

## 출력 형식 (반드시 JSON)
{
  "puzzles": [
    {
      "type": "cpq",
      "story_text": "스토리 맥락에서의 퍼즐 설명 (3~5줄)",
      "search_hint": "네이버에서 검색할 키워드 힌트",
      "campid": 캠페인ID숫자
    }
  ]
}

CPQ 미션 ${room.campaigns.length}개에 대해 각각 1개씩 퍼즐을 만들어. puzzles 배열로 반환해.`;

        const aiResponse = await callClaude(env.ANTHROPIC_API_KEY, storyPrompt, '위 조건대로 JSON을 생성해줘. 반드시 JSON만 출력해.');
        
        let cpqPuzzles = [];
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
          cpqPuzzles = parsed.puzzles || [];
        } catch {
          // AI 파싱 실패시 기본 템플릿 사용
          cpqPuzzles = room.campaigns.map(c => ({
            type: 'cpq',
            story_text: `${template.cpq_bridge}\n\n네이버에서 "${c.keyword}"를 검색해서 관련 정보를 찾아보세요. 정답을 입력하면 다음으로 넘어갈 수 있습니다.`,
            search_hint: c.keyword,
            campid: c.campid
          }));
        }
        
        // 퍼즐 순서 조합: 일반1 → CPQ1 → 일반2 → CPQ2(있으면)
        const orderedPuzzles = [];
        orderedPuzzles.push({
          index: 0,
          type: 'general',
          story_text: `첫 번째 관문이다. ${generalPuzzles[0].hint}`,
          question: generalPuzzles[0].question,
          answer: generalPuzzles[0].answer
        });
        
        if (cpqPuzzles[0]) {
          orderedPuzzles.push({
            index: 1,
            type: 'cpq',
            story_text: cpqPuzzles[0].story_text,
            search_hint: cpqPuzzles[0].search_hint || room.campaigns[0].keyword,
            campid: cpqPuzzles[0].campid || room.campaigns[0].campid
          });
        }
        
        orderedPuzzles.push({
          index: 2,
          type: 'general',
          story_text: `또 다른 단서를 발견했다. ${generalPuzzles[1].hint}`,
          question: generalPuzzles[1].question,
          answer: generalPuzzles[1].answer
        });
        
        if (cpqPuzzles[1]) {
          orderedPuzzles.push({
            index: 3,
            type: 'cpq',
            story_text: cpqPuzzles[1].story_text,
            search_hint: cpqPuzzles[1].search_hint || room.campaigns[1].keyword,
            campid: cpqPuzzles[1].campid || room.campaigns[1].campid
          });
        }
        
        // 클라이언트에 보낼 데이터 (정답은 CPQ만 제외, 일반은 포함)
        const clientPuzzles = orderedPuzzles.map(p => {
          if (p.type === 'general') {
            return { index: p.index, type: 'general', story_text: p.story_text, question: p.question };
          }
          return { index: p.index, type: 'cpq', story_text: p.story_text, search_hint: p.search_hint, campid: p.campid };
        });
        
        // 정답 매핑 (서버 검증용으로 roomId + 정답 반환)
        const answerMap = {};
        orderedPuzzles.forEach(p => {
          if (p.type === 'general') {
            answerMap[p.index] = p.answer.toLowerCase().trim();
          } else {
            const camp = room.campaigns.find(c => c.campid === p.campid);
            if (camp) answerMap[p.index] = camp.answer.toLowerCase().trim();
          }
        });
        
        return new Response(JSON.stringify({
          room: {
            id: room.id,
            title: template.title,
            emoji: template.emoji,
            intro: template.intro,
            puzzles: clientPuzzles
          },
          // 정답은 서버용이지만 MVP에서는 클라이언트에서도 검증 (나중에 서버 전용으로)
          _answers: answerMap
        }), { headers });
        
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
      }
    }

    // POST /api/room/check — 정답 체크
    if (url.pathname === '/api/room/check' && request.method === 'POST') {
      const body = await request.json();
      const { roomId, puzzleIndex, userAnswer } = body;
      
      try {
        const campaigns = await fetchCPQCampaigns(env.ADBC_API_URL, env.ADBC_TOKEN);
        const rooms = buildRooms(campaigns);
        const room = rooms.find(r => r.id === roomId);
        
        if (!room) {
          return new Response(JSON.stringify({ result: 'error', message: 'Room not found' }), { status: 404, headers });
        }
        
        // 퍼즐 인덱스에 따라 정답 확인
        const puzzleType = puzzleIndex % 2 === 0 ? 'general' : 'cpq';
        let correctAnswer = '';
        
        if (puzzleType === 'general') {
          const gIdx = puzzleIndex === 0 ? 0 : 1;
          // 일반 퍼즐은 클라이언트에서 이미 검증하므로 여기선 패스
          return new Response(JSON.stringify({ result: 'correct' }), { headers });
        } else {
          const cIdx = puzzleIndex === 1 ? 0 : 1;
          const camp = room.campaigns[cIdx];
          if (!camp) {
            return new Response(JSON.stringify({ result: 'error', message: 'Campaign not found' }), { status: 404, headers });
          }
          correctAnswer = camp.answer.toLowerCase().trim();
          const input = (userAnswer || '').toLowerCase().trim();
          
          if (input === correctAnswer) {
            // TODO: 나중에 adbc 참여 API 호출
            return new Response(JSON.stringify({ result: 'correct', message: '정답입니다! 🎉' }), { headers });
          } else {
            return new Response(JSON.stringify({ result: 'wrong', message: '틀렸습니다. 다시 시도해보세요.' }), { headers });
          }
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  }
};
