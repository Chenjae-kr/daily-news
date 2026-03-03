import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PROMPT_PATH = path.join(ROOT, 'prompt.md');

function nowKstDate() {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

function mdForCategory(title, date, section, key) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const lines = [
    `# ${date} ${title} 뉴스`,
    '',
    `## ${section?.headline || `${title} 주요 뉴스`}`,
    '',
  ];

  for (const it of items) {
    const t = it?.title || '제목 없음';
    const s = it?.summary || '요약 없음';
    const src = it?.source || '';
    const trust = it?.trust || '중간';
    lines.push(`- ${t} [신뢰도: ${trust}]`);
    lines.push(`  - 요약: ${s}${src ? ` [출처: ${src}]` : ''}`);
  }

  lines.push('', '---', '', `생성 키: ${key}`);
  return lines.join('\n');
}

async function run() {
  const date = process.env.TARGET_DATE || nowKstDate();
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4.1-mini';
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is required');
  }

  const promptMd = await fs.readFile(PROMPT_PATH, 'utf8');
  const prompt = `${promptMd}\n\n오늘 날짜는 ${date}입니다.\n다음 JSON만 출력하세요:\n{\n  "ai": {"headline":"...","items":[{"title":"...","summary":"...","source":"https://...","trust":"높음|중간|낮음"}]},\n  "tech": {"headline":"...","items":[...]},\n  "economy": {"headline":"...","items":[...]}\n}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a careful Korean news briefing assistant.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned empty content');

  const parsed = JSON.parse(extractJson(content));
  const key = `${date}-${Date.now()}`;

  const aiMd = mdForCategory('AI', date, parsed.ai, key);
  const techMd = mdForCategory('테크 & 비즈니스', date, parsed.tech, key);
  const ecoMd = mdForCategory('경제', date, parsed.economy, key);

  await fs.mkdir(path.join(ROOT, 'md', 'ai'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'md', 'tech'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'md', 'economy'), { recursive: true });

  await fs.writeFile(path.join(ROOT, 'md', 'ai', `${date}.md`), aiMd, 'utf8');
  await fs.writeFile(path.join(ROOT, 'md', 'tech', `${date}.md`), techMd, 'utf8');
  await fs.writeFile(path.join(ROOT, 'md', 'economy', `${date}.md`), ecoMd, 'utf8');

  console.log(`Generated daily news for ${date}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
