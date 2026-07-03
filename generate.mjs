// generate.mjs
// 매일 실행되어: 1) Claude API로 6개 분야 최신 뉴스를 검색·요약하고
//               2) template.html에 채워 넣어 docs/index.html을 만들고
//               3) docs/archive/에 그날 자 사본을 남깁니다.
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";

const CATEGORIES = [
  { id: "fashion", label: "FASHION", kor: "패션", color: "var(--c-fashion)" },
  { id: "beauty", label: "BEAUTY", kor: "뷰티", color: "var(--c-beauty)" },
  { id: "retail", label: "RETAIL", kor: "유통", color: "var(--c-retail)" },
  { id: "ai", label: "AI", kor: "AI", color: "var(--c-ai)" },
  { id: "tech", label: "TECH", kor: "테크", color: "var(--c-tech)" },
  { id: "art", label: "ART", kor: "아트", color: "var(--c-art)" },
];

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

async function fetchCategoryNews(category) {
  const prompt = `너는 뉴스 큐레이터야. "${category.kor}(${category.label})" 분야에서 지난 24시간 이내에 나온
중요한 뉴스를 웹 검색으로 찾아서 상위 4~5개를 골라줘.

규칙:
- 반드시 웹 검색 도구를 사용해서 실제 최신 기사를 찾을 것 (지어내지 말 것)
- 한국 독자를 대상으로 하되, 해외 주요 뉴스도 포함 가능
- 각 기사는 원문을 그대로 베끼지 말고 2~3문장으로 직접 요약할 것
- 아래 JSON 형식으로만 응답할 것 (설명, 코드블록 표시 없이 순수 JSON만)

{
  "stories": [
    {
      "title": "기사 제목 (한국어로, 간결하게)",
      "summary": "2~3문장 요약",
      "source": "언론사/매체 이름",
      "url": "기사 원문 URL"
    }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content: prompt }],
  });

  const textBlocks = response.content.filter((b) => b.type === "text").map((b) => b.text);
  const raw = textBlocks.join("\n").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`[${category.id}] JSON 파싱 실패, 원본:`, raw);
    return { stories: [] };
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error(`[${category.id}] JSON.parse 오류:`, e.message);
    return { stories: [] };
  }
}

function renderSection(category, stories) {
  if (!stories.length) return "";
  const items = stories
    .map(
      (s, i) => `
      <article class="story">
        <div class="story-head">
          <span class="story-index">${String(i + 1).padStart(2, "0")}</span>
          <h3 class="story-title"><a href="${escapeAttr(s.url || "#")}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a></h3>
        </div>
        <p class="story-summary">${escapeHtml(s.summary)}</p>
        <p class="story-source">${escapeHtml(s.source || "")}</p>
      </article>`
    )
    .join("\n");

  return `
  <section class="section" id="${category.id}">
    <div class="section-head">
      <span class="dot" style="background:${category.color}"></span>
      <span class="section-label">${category.label} · ${category.kor}</span>
      <span class="section-count">${stories.length}건</span>
      <span class="section-rule"></span>
    </div>
    ${items}
  </section>`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(str = "") {
  return String(str).replaceAll('"', "&quot;");
}

async function main() {
  const now = new Date();
  const dateKor = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  const dateISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now); // YYYY-MM-DD

  console.log("뉴스 수집 시작:", dateKor);

  let sectionsHtml = "";
  for (const category of CATEGORIES) {
    console.log(`- ${category.kor} 검색 중...`);
    const { stories } = await fetchCategoryNews(category);
    sectionsHtml += renderSection(category, stories || []);
  }

  const template = await fs.readFile(new URL("./template.html", import.meta.url), "utf-8");
  const html = template
    .replaceAll("{{DATE_KOR}}", dateKor)
    .replaceAll("{{SECTIONS}}", sectionsHtml);

  const docsDir = new URL("./docs/", import.meta.url);
  const archiveDir = new URL("./docs/archive/", import.meta.url);
  await fs.mkdir(archiveDir, { recursive: true });

  await fs.writeFile(new URL("./index.html", docsDir), html, "utf-8");
  await fs.writeFile(new URL(`./${dateISO}.html`, archiveDir), html, "utf-8");

  // 아카이브 목록 갱신
  const listPath = new URL("./index.json", archiveDir);
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(listPath, "utf-8"));
  } catch {
    /* 최초 실행 시 파일 없음 */
  }
  list.unshift({ date: dateISO, dateKor });
  list = list.filter((v, i, a) => a.findIndex((x) => x.date === v.date) === i).slice(0, 90);
  await fs.writeFile(listPath, JSON.stringify(list, null, 2), "utf-8");

  console.log("완료: docs/index.html 생성됨");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
