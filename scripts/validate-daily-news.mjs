import fs from 'node:fs/promises';
import path from 'node:path';

function nowKstDate() {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

async function check(file, mustInclude = []) {
  const content = await fs.readFile(file, 'utf8');
  if (content.length < 300) throw new Error(`${file} content too short`);
  for (const token of mustInclude) {
    if (!content.includes(token)) throw new Error(`${file} missing token: ${token}`);
  }
}

async function run() {
  const date = process.env.TARGET_DATE || nowKstDate();
  const files = [
    path.join('md', 'ai', `${date}.md`),
    path.join('md', 'tech', `${date}.md`),
    path.join('md', 'economy', `${date}.md`),
  ];

  for (const f of files) {
    await check(f, ['# ', '## ', '- ', '[출처:']);
  }

  console.log(`Validation passed for ${date}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
