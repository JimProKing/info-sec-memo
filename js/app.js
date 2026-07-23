/* 정보보안기사 기출 요약집 — memorization app */
(function () {
  "use strict";

  const STORAGE_KEY = "is-memo-progress-v1";

  const state = {
    data: null,
    view: "home", // home | chapter | study | search | about
    chapterId: null,
    pageN: null,
    searchQuery: "",
    hideMode: false, // 기본: 원본 노트 바로 표시 (가리기는 사용자가 켤 때만)
    revealed: true,
    progress: loadProgress(),
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }
  function isDone(n) {
    return !!state.progress[n];
  }
  function setDone(n, done) {
    if (done) state.progress[n] = Date.now();
    else delete state.progress[n];
    saveProgress();
    updateProgressUI();
  }
  function doneCount(pages) {
    return pages.filter((p) => isDone(p.n)).length;
  }
  function chapterById(id) {
    return state.data.chapters.find((c) => c.id === id);
  }
  function pageByN(n) {
    return state.data.pages.find((p) => p.n === n);
  }
  function pagesInChapter(id) {
    return state.data.pages.filter((p) => p.chapter === id);
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function highlight(text, q) {
    const safe = escapeHtml(text);
    if (!q) return safe;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return safe.replace(re, '<mark class="mark">$1</mark>');
  }

  function updateProgressUI() {
    const total = state.data?.pages?.length || 0;
    const done = Object.keys(state.progress).filter((k) => state.progress[k]).length;
    const label = $("#progress-label");
    const fill = $("#progress-fill");
    if (label) label.textContent = `${done}/${total}`;
    if (fill) fill.style.width = total ? `${(done / total) * 100}%` : "0%";
  }

  function closeSidebar() {
    $("#sidebar")?.classList.remove("open");
    const bd = $("#backdrop");
    if (bd) bd.hidden = true;
  }
  function openSidebar() {
    $("#sidebar")?.classList.add("open");
    const bd = $("#backdrop");
    if (bd) bd.hidden = false;
  }

  function renderSidebar() {
    const nav = $("#sidebar-nav");
    if (!nav || !state.data) return;
    nav.innerHTML = state.data.chapters
      .map((c) => {
        const pages = pagesInChapter(c.id);
        const d = doneCount(pages);
        const active = state.view === "chapter" && state.chapterId === c.id ? "active" : "";
        return `
          <button type="button" class="nav-chapter ${active}" data-chapter="${c.id}">
            <span class="nav-icon" style="box-shadow: inset 0 0 0 1px ${c.color}33">${c.icon}</span>
            <span>
              <div class="t">${escapeHtml(c.title)}</div>
              <div class="d">${escapeHtml(c.desc)}</div>
              <div class="meta">p.${c.start}–${c.end} · <span class="done">${d}/${pages.length}</span></div>
            </span>
          </button>`;
      })
      .join("");

    nav.querySelectorAll("[data-chapter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        goChapter(btn.dataset.chapter);
        closeSidebar();
      });
    });
  }

  function setBreadcrumbs(html) {
    const el = $("#breadcrumbs");
    if (el) el.innerHTML = html;
  }

  function goHome() {
    state.view = "home";
    state.chapterId = null;
    state.pageN = null;
    render();
  }
  function goChapter(id) {
    state.view = "chapter";
    state.chapterId = id;
    state.pageN = null;
    render();
  }
  function goStudy(n, opts = {}) {
    state.view = "study";
    state.pageN = n;
    state.chapterId = pageByN(n)?.chapter || state.chapterId;
    // 가리기 모드가 꺼져 있으면 항상 원본 표시
    // 가리기가 켜져 있을 때만 페이지 이동 시 다시 가림
    if (!opts.keepReveal) {
      state.revealed = !state.hideMode;
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goAbout() {
    state.view = "about";
    state.pageN = null;
    render();
    closeSidebar();
  }
  function goSearch(q) {
    state.view = "search";
    state.searchQuery = q;
    state.pageN = null;
    render();
  }

  function renderHome() {
    const { meta, chapters, pages } = state.data;
    const done = doneCount(pages);
    const total = pages.length;
    setBreadcrumbs("홈");
    return `
      <section class="hero">
        <div class="hero-kicker"><span></span> Original Summary · 손글씨 원본</div>
        <h2>${escapeHtml(meta.promo.headline)}</h2>
        <p class="lead">
          ${escapeHtml(meta.tagline)}.
          PDF에 적어 둔 기출 핵심을 그대로 옮겼고, 한 장씩 가려 가며 스스로 떠올리게 만들었습니다.
        </p>
        <div class="hero-actions">
          <button type="button" class="btn btn-accent" data-action="start">첫 장부터 암기 시작</button>
          <button type="button" class="btn btn-primary" data-action="continue">이어서 보기</button>
          <button type="button" class="btn btn-ghost" data-action="about">요약집 소개</button>
        </div>
        <div class="hero-stats">
          <div class="stat"><div class="n">${total}</div><div class="l">원본 노트 페이지</div></div>
          <div class="stat"><div class="n">${chapters.length}</div><div class="l">과목 · 테마 묶음</div></div>
          <div class="stat"><div class="n">${done}</div><div class="l">암기 완료 표시</div></div>
        </div>
      </section>

      <div class="promo-panel">
        <div class="panel">
          <h3>✨ 왜 이 요약집인가</h3>
          <ul class="feature-list">
            ${meta.promo.points
              .map(
                (p, i) =>
                  `<li><span class="dot">${i + 1}</span><span>${escapeHtml(p)}</span></li>`
              )
              .join("")}
            <li><span class="dot">★</span><span>빨간 펜·파란 펜 강조까지 원본 그대로 — 시험장 리콜용</span></li>
          </ul>
        </div>
        <div class="panel">
          <h3>📖 암기하는 방법</h3>
          <div class="howto">
            <div class="howto-step"><span class="num">1</span><span>키워드(제목)만 보고 내용을 먼저 말해 본다</span></div>
            <div class="howto-step"><span class="num">2</span><span><strong>가리기</strong>를 해제해 손글씨 원본과 대조</span></div>
            <div class="howto-step"><span class="num">3</span><span>외웠으면 <strong>암기 완료</strong> 체크</span></div>
            <div class="howto-step"><span class="num">4</span><span><strong>랜덤</strong>으로 약한 페이지만 다시 돌린다</span></div>
          </div>
        </div>
      </div>

      <div class="section-title">
        <h3>과목별 노트</h3>
        <span>클릭하면 해당 구간 목록</span>
      </div>
      <div class="chapter-grid">
        ${chapters
          .map((c) => {
            const ps = pagesInChapter(c.id);
            const d = doneCount(ps);
            const pct = ps.length ? Math.round((d / ps.length) * 100) : 0;
            return `
              <button type="button" class="chapter-card" data-chapter="${c.id}">
                <div class="top">
                  <span class="icon" style="background:${c.color}22">${c.icon}</span>
                  <h4>${escapeHtml(c.title)}</h4>
                </div>
                <div class="desc">${escapeHtml(c.desc)}</div>
                <div class="foot">
                  <span>p.${c.start}–${c.end} · ${d}/${ps.length}</span>
                  <span class="mini-bar"><i style="width:${pct}%"></i></span>
                </div>
              </button>`;
          })
          .join("")}
      </div>

      <div class="panel" style="margin-bottom:8px">
        <h3>📣 이 요약본에 대해</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:12px;line-height:1.65">
          시중 교재가 아니라, 기출을 풀며 <strong style="color:var(--text)">직접 압축·필기한 요약 노트</strong>입니다.
          웹사이트는 그 원본을 시험 전까지 매일 넘기며 외우라고 만들었습니다.
          문의·공유 요청은 아래 연락처로 주세요.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <a class="btn btn-sm btn-ghost" href="mailto:${escapeHtml(meta.contact.email)}">✉ ${escapeHtml(meta.contact.email)}</a>
          <span class="btn btn-sm btn-ghost" style="cursor:default">💬 Kakao ${escapeHtml(meta.contact.kakao)}</span>
        </div>
      </div>
    `;
  }

  function renderChapter() {
    const c = chapterById(state.chapterId);
    if (!c) return renderHome();
    const pages = pagesInChapter(c.id);
    const d = doneCount(pages);
    setBreadcrumbs(`홈 / <strong>${escapeHtml(c.title)}</strong>`);
    return `
      <div class="section-title" style="margin-bottom:18px">
        <div>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">${c.icon} 과목</div>
          <h3 style="font-size:1.35rem">${escapeHtml(c.title)}</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-top:6px">${escapeHtml(c.desc)} · p.${c.start}–${c.end}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-sm btn-accent" data-action="study-first">이 과목 암기</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="home">← 홈</button>
        </div>
      </div>
      <div class="panel" style="margin-bottom:14px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:13px;color:var(--text-muted)">진도 <strong style="color:var(--success)">${d}/${pages.length}</strong></span>
        <span class="mini-bar" style="width:140px;height:7px"><i style="width:${pages.length ? (d / pages.length) * 100 : 0}%"></i></span>
      </div>
      <div class="page-list">
        ${pages
          .map(
            (p) => `
          <button type="button" class="page-row ${isDone(p.n) ? "done" : ""}" data-page="${p.n}">
            <span class="page-num">${String(p.n).padStart(2, "0")}</span>
            <span>
              <div class="ptitle">${escapeHtml(p.title)}</div>
              <div class="psub">손글씨 원본 · 탭하여 암기</div>
            </span>
            <span class="badge">${isDone(p.n) ? "암기 완료" : "미완료"}</span>
          </button>`
          )
          .join("")}
      </div>
    `;
  }

  function renderStudy() {
    const p = pageByN(state.pageN);
    if (!p) return renderHome();
    const c = chapterById(p.chapter);
    const total = state.data.pages.length;
    // partial = waiting for user to reveal (active recall). Never leave blur after reveal.
    const partial = state.hideMode && !state.revealed;

    setBreadcrumbs(
      `홈 / <a href="#" data-nav-chapter="${c.id}">${escapeHtml(c.title)}</a> / <strong>p.${p.n}</strong>`
    );

    const done = isDone(p.n);
    // cache-bust so refreshed high-res pages load after re-export
    const imgSrc = `${escapeHtml(p.src)}?v=2`;
    return `
      <div class="study">
        <div class="study-toolbar">
          <div class="left">
            <button type="button" class="btn btn-sm btn-ghost" data-action="prev" ${p.n <= 1 ? "disabled" : ""}>← 이전</button>
            <button type="button" class="btn btn-sm btn-ghost" data-action="next" ${p.n >= total ? "disabled" : ""}>다음 →</button>
            <span class="study-title"><strong>p.${p.n}</strong> · ${escapeHtml(p.title)}</span>
          </div>
          <div class="right">
            <button type="button" class="btn btn-sm ${state.hideMode ? "btn-warn" : "btn-ghost"}" data-action="toggle-hide" title="가리기 모드">
              ${state.hideMode ? "👁 가리기 ON" : "👁 가리기 OFF"}
            </button>
            <button type="button" class="btn btn-sm btn-success ${done ? "on" : ""}" data-action="toggle-done">
              ${done ? "✓ 암기 완료" : "암기 완료"}
            </button>
          </div>
        </div>

        ${
          partial
            ? `<div class="recall-card">
                <div class="q-label">Active Recall · 먼저 떠올려 보기</div>
                <h3>${escapeHtml(p.title)}</h3>
                <p>${escapeHtml(c.title)} · ${p.n} / ${total} 페이지</p>
                <p style="margin-top:10px;font-size:12.5px">내용을 말로 말한 뒤, 아래 노트를 탭하거나 <kbd>Space</kbd>로 확인하세요.</p>
              </div>`
            : ""
        }

        <div class="note-stage">
          <div class="note-frame ${partial ? "partial" : ""}" id="note-frame">
            <img src="${imgSrc}" alt="요약 노트 ${p.n}페이지: ${escapeHtml(p.title)}" loading="eager" decoding="async" draggable="false" />
            ${
              partial
                ? `<div class="note-cover" data-action="reveal"><span class="hint">탭하여 원본 노트 확인</span></div>`
                : ""
            }
          </div>
        </div>

        <div class="study-nav">
          <button type="button" class="btn btn-ghost" data-action="prev" ${p.n <= 1 ? "disabled" : ""}>← p.${Math.max(1, p.n - 1)}</button>
          <span class="page-indicator"><strong>${p.n}</strong> / ${total}</span>
          <button type="button" class="btn btn-primary" data-action="next" ${p.n >= total ? "disabled" : ""}>
            ${p.n >= total ? "마지막" : `p.${p.n + 1} →`}
          </button>
        </div>
        <p class="kbd-hint">
          단축키 <kbd>←</kbd><kbd>→</kbd> 이동 · <kbd>Space</kbd> 가리기 해제 · <kbd>M</kbd> 암기 완료 · <kbd>H</kbd> 가리기 토글 · <kbd>R</kbd> 랜덤
        </p>
      </div>
    `;
  }

  function renderSearch() {
    const q = state.searchQuery.trim();
    setBreadcrumbs(`검색 / <strong>${escapeHtml(q)}</strong>`);
    if (!q) {
      return `<div class="empty"><h3>검색어를 입력하세요</h3><p>페이지 제목·키워드·번호</p></div>`;
    }
    const qLower = q.toLowerCase();
    const results = state.data.pages.filter((p) => {
      const c = chapterById(p.chapter);
      return (
        String(p.n) === q ||
        p.title.toLowerCase().includes(qLower) ||
        c.title.toLowerCase().includes(qLower) ||
        c.desc.toLowerCase().includes(qLower)
      );
    });
    if (!results.length) {
      return `<div class="empty"><h3>결과 없음</h3><p>다른 키워드로 검색해 보세요.</p></div>`;
    }
    return `
      <div class="section-title"><h3>검색 결과 ${results.length}건</h3></div>
      <div class="search-results page-list">
        ${results
          .map((p) => {
            const c = chapterById(p.chapter);
            return `
              <button type="button" class="page-row ${isDone(p.n) ? "done" : ""}" data-page="${p.n}">
                <span class="page-num">${String(p.n).padStart(2, "0")}</span>
                <span>
                  <div class="ptitle">${highlight(p.title, q)}</div>
                  <div class="psub">${escapeHtml(c.title)}</div>
                </span>
                <span class="badge">${isDone(p.n) ? "완료" : "미완료"}</span>
              </button>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderAbout() {
    const { meta } = state.data;
    setBreadcrumbs("홈 / <strong>요약집 소개</strong>");
    return `
      <div class="about-hero">
        <div class="hero-kicker"><span></span> 기출 요약집 홍보</div>
        <h2>${escapeHtml(meta.title)}</h2>
        <p>
          ${escapeHtml(meta.promo.headline)}.
          교재를 통째로 옮긴 것이 아니라, 시험에 나오는 표현·숫자·절차만 손글씨로 압축한
          <strong style="color:var(--text)">원본 요약 노트</strong>를 웹 암기장으로 공개합니다.
        </p>
      </div>
      <div class="about-grid">
        <div class="about-card">
          <h4>🖊️ 손글씨 원본</h4>
          <p>형광펜·색펜 강조가 살아있는 필기 그대로. 평소 보던 노트 감각으로 복습합니다.</p>
        </div>
        <div class="about-card">
          <h4>🧠 능동 회상</h4>
          <p>제목만 보고 먼저 말하고, 가리기를 풀어 대조. 수동 읽기보다 기억에 남습니다.</p>
        </div>
        <div class="about-card">
          <h4>📊 진도 관리</h4>
          <p>페이지별 암기 완료 표시가 브라우저에 저장됩니다. 로그인 없이 가볍게.</p>
        </div>
        <div class="about-card">
          <h4>🎲 랜덤 복습</h4>
          <p>안 외운 페이지만 무작위로 뽑아 약점만 반복합니다.</p>
        </div>
      </div>
      <div class="panel" style="margin-bottom:16px">
        <h3>구성</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin-top:8px;line-height:1.7">
          총 <strong style="color:var(--text)">${meta.pageCount}페이지</strong> ·
          시스템 보안, 네트워크, VPN·보안장비, 웹 보안, 실무 도구, 정보보호 관리, 법·개인정보, 종합 복습.
        </p>
      </div>
      <div class="panel">
        <h3>문의 · 공유</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin:8px 0 14px;line-height:1.65">
          요약집 원본·학습 사이트에 대한 문의, 피드백, 공유 요청은 아래로 연락 주세요.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <a class="btn btn-accent" href="mailto:${escapeHtml(meta.contact.email)}">이메일 보내기</a>
          <span class="btn btn-ghost" style="cursor:default">Kakao ID: ${escapeHtml(meta.contact.kakao)}</span>
          <button type="button" class="btn btn-primary" data-action="start">암기 시작하기</button>
        </div>
      </div>
    `;
  }

  function render() {
    const root = $("#content");
    if (!root || !state.data) return;
    renderSidebar();
    updateProgressUI();

    let html = "";
    if (state.view === "home") html = renderHome();
    else if (state.view === "chapter") html = renderChapter();
    else if (state.view === "study") html = renderStudy();
    else if (state.view === "search") html = renderSearch();
    else if (state.view === "about") html = renderAbout();
    else html = renderHome();

    root.innerHTML = html;
    bindContentEvents(root);
  }

  function firstIncomplete() {
    const p = state.data.pages.find((x) => !isDone(x.n));
    return p ? p.n : 1;
  }

  function randomPage() {
    const undone = state.data.pages.filter((p) => !isDone(p.n));
    const pool = undone.length ? undone : state.data.pages;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    goStudy(pick.n);
  }

  function bindContentEvents(root) {
    root.querySelectorAll("[data-chapter]").forEach((el) => {
      el.addEventListener("click", () => goChapter(el.dataset.chapter));
    });
    root.querySelectorAll("[data-page]").forEach((el) => {
      el.addEventListener("click", () => goStudy(Number(el.dataset.page)));
    });
    root.querySelectorAll("[data-nav-chapter]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        goChapter(el.dataset.navChapter);
      });
    });

    root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const action = el.dataset.action;
        if (action === "start") goStudy(1);
        if (action === "continue") goStudy(firstIncomplete());
        if (action === "about") goAbout();
        if (action === "home") goHome();
        if (action === "study-first") {
          const pages = pagesInChapter(state.chapterId);
          const first = pages.find((p) => !isDone(p.n)) || pages[0];
          if (first) goStudy(first.n);
        }
        if (action === "prev" && state.pageN > 1) goStudy(state.pageN - 1);
        if (action === "next" && state.pageN < state.data.pages.length) goStudy(state.pageN + 1);
        if (action === "reveal") {
          state.revealed = true;
          render();
        }
        if (action === "toggle-hide") {
          state.hideMode = !state.hideMode;
          state.revealed = !state.hideMode;
          render();
        }
        if (action === "toggle-done" && state.pageN) {
          setDone(state.pageN, !isDone(state.pageN));
          render();
        }
        e.stopPropagation();
      });
    });

    // cover click
    const cover = root.querySelector(".note-cover");
    if (cover) {
      cover.addEventListener("click", () => {
        state.revealed = true;
        render();
      });
    }
    const frame = root.querySelector("#note-frame.partial");
    if (frame) {
      frame.addEventListener("click", () => {
        state.revealed = true;
        render();
      });
    }
  }

  function bindGlobal() {
    $("#brand")?.addEventListener("click", () => {
      goHome();
      closeSidebar();
    });
    $("#btn-about")?.addEventListener("click", goAbout);
    $("#btn-random")?.addEventListener("click", randomPage);
    $("#menu-toggle")?.addEventListener("click", () => {
      const open = $("#sidebar")?.classList.contains("open");
      if (open) closeSidebar();
      else openSidebar();
    });
    $("#backdrop")?.addEventListener("click", closeSidebar);

    $("#btn-reset")?.addEventListener("click", () => {
      if (confirm("암기 진도를 모두 초기화할까요?")) {
        state.progress = {};
        saveProgress();
        updateProgressUI();
        render();
      }
    });

    let searchTimer;
    $("#search")?.addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      const q = e.target.value;
      searchTimer = setTimeout(() => {
        if (!q.trim()) {
          if (state.view === "search") goHome();
          return;
        }
        goSearch(q);
      }, 180);
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (state.view !== "study") {
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          randomPage();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (state.pageN > 1) goStudy(state.pageN - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (state.pageN < state.data.pages.length) goStudy(state.pageN + 1);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (state.hideMode && !state.revealed) {
          state.revealed = true;
          render();
        } else if (state.pageN < state.data.pages.length) {
          goStudy(state.pageN + 1);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setDone(state.pageN, !isDone(state.pageN));
        render();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        state.hideMode = !state.hideMode;
        state.revealed = !state.hideMode;
        render();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        randomPage();
      }
    });
  }

  async function init() {
    bindGlobal();
    try {
      const res = await fetch("data/site.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("site.json load failed");
      state.data = await res.json();
      updateProgressUI();
      render();
    } catch (err) {
      console.error(err);
      const root = $("#content");
      if (root) {
        root.innerHTML = `
          <div class="empty">
            <h3>데이터를 불러오지 못했습니다</h3>
            <p style="margin-top:8px">로컬 서버로 열어 주세요.<br/>
            <code style="color:var(--accent)">npx serve .</code> 또는
            <code style="color:var(--accent)">python -m http.server 8080</code></p>
          </div>`;
      }
    }
  }

  init();
})();
