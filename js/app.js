/**
 * Lingoa v2.6 Landing Page Interactive Engine
 * - Bilingual RTL/LTR Engine (Arabic-First)
 * - 30-Second Oxford Placement Quiz + Personalized Study Plan
 * - Live Nasseh Rive Robot Companion (assets/robot.riv, lazy-loaded)
 * - Interactive 3D FSRS Flashcard + Oxford Audio Marquee
 * - Web Speech API Pronunciation + Web Audio SFX + Confetti Burst
 * - Dynamic UTM Attribution + Meta Pixel / GA4 Events
 */
(function () {
  'use strict';

  const STATE = {
    lang: 'ar',
    quizSetIdx: 0,
    qIdx: 0,
    score: 0,
    xp: 0,
    answered: false,
    quizStartedTracked: false,
    quizFinished: false,
    flashIdx: 0,
    flashFlipped: false,
    heroTabIdx: 0,
    heroAutoTimer: null,
    riveInstance: null,
    riveExprInput: null,
    riveLoaded: false,
    audioCtx: null
  };

  const HERO_SCREENS = [
    { src: 'assets/webp/screen_daily_learn.webp', captionAr: 'لوحة التعلم اليومي وخطة الكلمات', captionEn: 'Daily Learning Dashboard & Review Queue' },
    { src: 'assets/webp/screen_word_video_context.webp', captionAr: 'فيديوهات متحدثين أصليين من TED لكل كلمة', captionEn: 'Authentic TED Native Video Clips' },
    { src: 'assets/webp/screen_home_widgets.webp', captionAr: 'ويدجت شاشة الموبايل التفاعلي والتقويم', captionEn: 'Interactive Android Home Screen Widgets' },
    { src: 'assets/webp/screen_unit_story.webp', captionAr: 'قصص الوحدات الناطقة مع الترجمة والاختبارات', captionEn: 'Narrated Unit Stories & Translations' }
  ];

  /* ========================================================================
     1. Sound Effects (Zero-asset Web Audio API) & English Pronunciation
     ======================================================================== */
  function playTone(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!STATE.audioCtx) STATE.audioCtx = new AudioCtx();
      const ctx = STATE.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const playNote = (freq, start, dur, gainPeak, oscType) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oscType || 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      };

      if (type === 'correct') {
        playNote(523.25, now, 0.14, 0.08, 'triangle');
        playNote(659.25, now + 0.08, 0.16, 0.08, 'triangle');
        playNote(783.99, now + 0.16, 0.22, 0.09, 'triangle');
      } else if (type === 'wrong') {
        playNote(260, now, 0.16, 0.06, 'sine');
        playNote(215, now + 0.11, 0.2, 0.05, 'sine');
      } else if (type === 'win') {
        playNote(523.25, now, 0.12, 0.08, 'triangle');
        playNote(659.25, now + 0.09, 0.12, 0.08, 'triangle');
        playNote(783.99, now + 0.18, 0.14, 0.08, 'triangle');
        playNote(1046.5, now + 0.28, 0.35, 0.1, 'triangle');
      } else if (type === 'tap') {
        playNote(620, now, 0.07, 0.04, 'sine');
      }
    } catch (_) {}
  }

  function speakEnglish(text, chipEl) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.92;
      utter.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
      if (preferred) utter.voice = preferred;
      if (chipEl) {
        chipEl.classList.add('speaking');
        utter.onend = () => chipEl.classList.remove('speaking');
        utter.onerror = () => chipEl.classList.remove('speaking');
      }
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  /* ========================================================================
     2. Nasseh Rive Robot Companion (Lazy-loaded, Exact cropPanel Match)
     ======================================================================== */
  function setNassehMood(exprValue, bubbleText) {
    if (STATE.riveExprInput) {
      try {
        STATE.riveExprInput.value = exprValue;
      } catch (_) {}
    }
    if (bubbleText) {
      const bubble = document.getElementById('nassehBubble');
      if (bubble) bubble.textContent = bubbleText;
    }
  }

  function initNassehRive() {
    if (STATE.riveLoaded) return;
    STATE.riveLoaded = true;
    const canvas = document.getElementById('nassehCanvas');
    const fallback = document.getElementById('nassehFallback');
    if (!canvas) return;

    function mountRive() {
      if (!window.rive || !window.rive.Rive) return;
      try {
        const r = new window.rive.Rive({
          src: 'assets/robot.riv',
          canvas: canvas,
          autoplay: true,
          stateMachines: 'State Machine 1',
          layout: new window.rive.Layout({
            fit: window.rive.Fit.Fill,
            alignment: window.rive.Alignment.Center
          }),
          onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            try {
              const inputs = r.stateMachineInputs('State Machine 1') || [];
              const expr = inputs.find((i) => i.name === 'Expressions');
              const seasonal = inputs.find((i) => i.name === 'Seasonal');
              const tracking = inputs.find((i) => i.name === 'IsTracking');
              if (seasonal) seasonal.value = 0;
              if (tracking) tracking.value = false;
              if (expr) {
                expr.value = 1; // Smiling idle
                STATE.riveExprInput = expr;
              }
            } catch (_) {}
            STATE.riveInstance = r;
            if (fallback) fallback.classList.add('hidden');
          },
          onLoadError: () => {
            if (fallback) fallback.classList.remove('hidden');
          }
        });
      } catch (_) {
        if (fallback) fallback.classList.remove('hidden');
      }
    }

    if (window.rive && window.rive.Rive) {
      mountRive();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@rive-app/canvas@2.24.0';
    script.async = true;
    script.onload = mountRive;
    script.onerror = () => {
      if (fallback) fallback.classList.remove('hidden');
    };
    document.head.appendChild(script);
  }

  /* ========================================================================
     3. Confetti Burst on Quiz Completion
     ======================================================================== */
  function fireConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const colors = ['#2DD4BF', '#FBBF24', '#3B82F6', '#22C55E', '#F472B6', '#FFFFFF'];
    const particles = Array.from({ length: 68 }, () => ({
      x: canvas.width * (0.25 + Math.random() * 0.5),
      y: canvas.height * 0.42,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 10 - 3,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 14,
      life: 1
    }));

    let frame = 0;
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.rot += p.vrot;
        p.life -= 0.015;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 110) {
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ========================================================================
     4. 30-Second Oxford Placement Quiz Engine
     ======================================================================== */
  function formatHighlight(sentence) {
    const escaped = sentence.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function renderQuizQuestion() {
    const dict = window.LINGOA_I18N[STATE.lang];
    const set = window.LINGOA_QUIZ_SETS[STATE.quizSetIdx];
    const q = set[STATE.qIdx];

    const activeView = document.getElementById('quizActiveView');
    const resultView = document.getElementById('quizResultView');
    if (activeView) activeView.style.display = 'block';
    if (resultView) resultView.classList.remove('show');

    const stepBadge = document.getElementById('quizStepText');
    const levelPill = document.getElementById('quizLevelPill');
    const progressFill = document.getElementById('quizProgressFill');
    const wordEl = document.getElementById('quizWord');
    const phoneticEl = document.getElementById('quizPhonetic');
    const sentenceEl = document.getElementById('quizSentence');
    const optionsWrap = document.getElementById('quizOptions');
    const feedbackEl = document.getElementById('quizFeedback');
    const xpEl = document.getElementById('nassehXpVal');

    if (stepBadge) stepBadge.textContent = `${dict.quizStepPrefix} ${STATE.qIdx + 1} ${dict.quizStepOf} ${set.length}`;
    if (levelPill) {
      levelPill.textContent = q.level;
      levelPill.className = `cefr-tag cefr-${q.level}`;
    }
    if (progressFill) progressFill.style.width = `${((STATE.qIdx + 1) / set.length) * 100}%`;
    if (wordEl) wordEl.textContent = q.word;
    if (phoneticEl) phoneticEl.textContent = q.phonetic;
    if (sentenceEl) sentenceEl.innerHTML = formatHighlight(q.sentenceEn);
    if (xpEl) xpEl.textContent = `${STATE.xp} XP`;
    if (feedbackEl) feedbackEl.className = 'quiz-feedback';

    if (!STATE.answered) {
      setNassehMood(1, dict.nassehIdle);
    }

    const opts = STATE.lang === 'ar' ? q.optionsAr : q.optionsEn;
    const correctAns = STATE.lang === 'ar' ? q.correctAr : q.correctEn;

    if (optionsWrap) {
      optionsWrap.innerHTML = '';
      opts.forEach((optText) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-opt';
        btn.innerHTML = `<span>${optText}</span><span class="opt-icon" aria-hidden="true"></span>`;
        btn.addEventListener('click', () => handleQuizAnswer(btn, optText, correctAns, q));
        optionsWrap.appendChild(btn);
      });
    }
  }

  function handleQuizAnswer(clickedBtn, selected, correct, q) {
    if (STATE.answered) return;
    STATE.answered = true;

    if (!STATE.quizStartedTracked) {
      STATE.quizStartedTracked = true;
      window.trackLingoaEvent('StartQuiz', { set_index: STATE.quizSetIdx });
    }

    const dict = window.LINGOA_I18N[STATE.lang];
    const set = window.LINGOA_QUIZ_SETS[STATE.quizSetIdx];
    const isCorrect = selected === correct;

    const allBtns = document.querySelectorAll('#quizOptions .quiz-opt');
    allBtns.forEach((b) => {
      b.disabled = true;
      const txt = b.querySelector('span').textContent;
      if (txt === correct) {
        b.classList.add('is-correct');
        b.querySelector('.opt-icon').textContent = '✓';
      } else if (b === clickedBtn && !isCorrect) {
        b.classList.add('is-wrong');
        b.querySelector('.opt-icon').textContent = '✕';
      }
    });

    if (isCorrect) {
      STATE.score += 1;
      STATE.xp += 25;
      playTone('correct');
      setNassehMood(2, dict.nassehHappy);
    } else {
      STATE.xp += 5;
      playTone('wrong');
      setNassehMood(3, dict.nassehSad);
    }

    const xpEl = document.getElementById('nassehXpVal');
    if (xpEl) xpEl.textContent = `${STATE.xp} XP`;

    const feedbackEl = document.getElementById('quizFeedback');
    const feedbackTxt = document.getElementById('quizFeedbackText');
    const nextBtn = document.getElementById('quizNextBtn');

    if (feedbackTxt) {
      const sentenceNote = STATE.lang === 'ar' ? q.sentenceAr : `Collocation: "${q.collocation}"`;
      feedbackTxt.innerHTML = isCorrect
        ? `${dict.quizCorrectMsg}<small>${sentenceNote}</small>`
        : `${dict.quizWrongMsg} <strong>${correct}</strong><small>${sentenceNote}</small>`;
    }
    if (nextBtn) {
      nextBtn.textContent = STATE.qIdx === set.length - 1 ? dict.quizFinishBtn : dict.quizNextBtn;
    }
    if (feedbackEl) {
      feedbackEl.className = `quiz-feedback show ${isCorrect ? 'ok' : 'err'}`;
    }
  }

  function renderQuizResult() {
    STATE.quizFinished = true;
    const dict = window.LINGOA_I18N[STATE.lang];
    const set = window.LINGOA_QUIZ_SETS[STATE.quizSetIdx];
    const activeView = document.getElementById('quizActiveView');
    const resultView = document.getElementById('quizResultView');

    if (activeView) activeView.style.display = 'none';
    if (resultView) resultView.classList.add('show');

    let estLevel, wordsRemaining, dailyGoal, planText;
    if (STATE.score <= 1) {
      estLevel = STATE.lang === 'ar' ? 'A1 — مرحلة التأسيس الذكي' : 'A1 — Smart Foundation';
      wordsRemaining = '2,950';
      dailyGoal = STATE.lang === 'ar' ? '15 كلمة / يوم' : '15 words / day';
      planText = STATE.lang === 'ar'
        ? 'بداية ممتازة! داخل Lingoa هتبدأ من الوحدة الأولى A1 مع شرح عربي واضح وفيديوهات TED وويدجت الشاشة — خلال 60 يوم فقط هتمتلك أقوى 900 كلمة تغطي 75% من الإنجليزي اليومي.'
        : 'Great starting point! Inside Lingoa you start at Unit 1 (A1) with native TED clips and FSRS spaced reviews — in 60 days you will lock in 900 core words covering 75% of daily English.';
    } else if (STATE.score <= 3) {
      estLevel = STATE.lang === 'ar' ? 'A2–B1 — متوسط واعد' : 'A2–B1 — Rising Intermediate';
      wordsRemaining = '1,650';
      dailyGoal = STATE.lang === 'ar' ? '20 كلمة / يوم' : '20 words / day';
      planText = STATE.lang === 'ar'
        ? 'عندك أساس حلو جداً! اللي ناقصك عشان تكسر حاجز التوقف وتفهم الأفلام والمحادثات بدون ترجمة هو تثبيت كلمات B1 و B2 و 9,790 عبارة حقيقية مع وضع المواصلات وجروبات التحدي.'
        : 'Solid foundation! To break the intermediate plateau and follow movies effortlessly, Lingoa focuses your FSRS queue on B1/B2 vocabulary, 9,790 collocations, and Commute audio reviews.';
    } else {
      estLevel = STATE.lang === 'ar' ? 'B1–B2 — قريب من الطلاقة 🔥' : 'B1–B2 — Near Fluent 🔥';
      wordsRemaining = '714';
      dailyGoal = STATE.lang === 'ar' ? '15 كلمة B2 / يوم' : '15 B2 words / day';
      planText = STATE.lang === 'ar'
        ? 'ما شاء الله مستواك قوي جداً! الخطوة الجاية داخل Lingoa هي إتقان الـ 714 كلمة الأعلى في B2 وتقليد نطق المتحدثين الأصليين في Shadowing Studio وتحدي صحابك يومياً.'
        : 'Impressive score! Inside Lingoa, jump straight into the 714 high-impact B2 words, Shadowing Studio rhythm drills, and live Challenge Squads to sharpen real fluency.';
    }

    document.getElementById('resLevelBadge').textContent = estLevel;
    document.getElementById('resScoreVal').textContent = `${STATE.score} / ${set.length}`;
    document.getElementById('resXpVal').textContent = `+${STATE.xp} XP`;
    document.getElementById('resGoalVal').textContent = dailyGoal;
    document.getElementById('resPlanText').textContent = planText;

    setNassehMood(5, dict.nassehDone);
    playTone('win');
    fireConfetti();

    window.trackLingoaEvent('CompleteQuiz', {
      score: STATE.score,
      total: set.length,
      estimated_level: estLevel,
      words_remaining: wordsRemaining
    });
  }

  function resetQuiz(switchSet) {
    if (switchSet) {
      STATE.quizSetIdx = (STATE.quizSetIdx + 1) % window.LINGOA_QUIZ_SETS.length;
    }
    STATE.qIdx = 0;
    STATE.score = 0;
    STATE.xp = 0;
    STATE.answered = false;
    STATE.quizFinished = false;
    renderQuizQuestion();
  }

  /* ========================================================================
     5. Interactive 3D FSRS Flashcard Demo
     ======================================================================== */
  function renderFlashcard() {
    const card = window.LINGOA_FLASHCARDS[STATE.flashIdx];
    const flipEl = document.getElementById('demoFlipCard');
    if (flipEl) flipEl.classList.toggle('flipped', STATE.flashFlipped);

    document.getElementById('fcLevel').textContent = card.level;
    document.getElementById('fcLevel').className = `cefr-tag cefr-${card.level}`;
    document.getElementById('fcWord').textContent = card.word;
    document.getElementById('fcPhonetic').textContent = `${card.phonetic} • ${card.pos}`;
    document.getElementById('fcMeaningAr').textContent = card.ar;
    document.getElementById('fcExampleEn').textContent = card.exampleEn;
    document.getElementById('fcExampleAr').textContent = card.exampleAr;
    document.getElementById('fcColloc').textContent = card.collocation;
  }

  /* ========================================================================
     6. Oxford Interactive Audio Marquee
     ======================================================================== */
  function buildMarquee() {
    const track = document.getElementById('marqueeTrack');
    if (!track) return;
    const items = window.LINGOA_MARQUEE_WORDS;
    // Duplicate list for seamless infinite loop
    const combined = items.concat(items);
    track.innerHTML = '';
    combined.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-chip';
      btn.setAttribute('aria-label', `Pronounce ${item.word}`);
      btn.innerHTML = `
        <span class="cefr-tag cefr-${item.level}">${item.level}</span>
        <span class="word-chip-en">${item.word}</span>
        <span class="word-chip-ar">${item.ar}</span>
        <span aria-hidden="true" style="opacity:.7">🔊</span>
      `;
      btn.addEventListener('click', () => {
        playTone('tap');
        speakEnglish(item.word, btn);
      });
      track.appendChild(btn);
    });
  }

  /* ========================================================================
     7. Hero Interactive Phone Switcher
     ======================================================================== */
  function switchHeroScreen(idx, manual) {
    STATE.heroTabIdx = idx;
    const img = document.getElementById('heroPhoneImg');
    const tabs = document.querySelectorAll('.phone-tab');
    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));

    if (img) {
      img.classList.add('switching');
      setTimeout(() => {
        img.src = HERO_SCREENS[idx].src;
        img.alt = STATE.lang === 'ar' ? HERO_SCREENS[idx].captionAr : HERO_SCREENS[idx].captionEn;
        img.classList.remove('switching');
      }, 160);
    }
    if (manual && STATE.heroAutoTimer) {
      clearInterval(STATE.heroAutoTimer);
      STATE.heroAutoTimer = null;
    }
  }

  /* ========================================================================
     8. Bilingual Copy & Dynamic Table/FAQ Rendering
     ======================================================================== */
  function applyLanguage(lang) {
    STATE.lang = lang === 'en' ? 'en' : 'ar';
    const dict = window.LINGOA_I18N[STATE.lang];

    document.documentElement.lang = dict.lang;
    document.documentElement.dir = dict.dir;
    document.title = dict.pageTitle;

    try {
      localStorage.setItem('lingoa_lang', STATE.lang);
    } catch (_) {}

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) langBtn.textContent = STATE.lang === 'ar' ? 'EN' : 'عربي';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    // Render comparison table rows
    const cmpBody = document.getElementById('compareTableBody');
    if (cmpBody && dict.cmpRows) {
      cmpBody.innerHTML = dict.cmpRows.map(([aspect, oldWay, lingoaWay]) => `
        <tr>
          <td><strong>${aspect}</strong></td>
          <td class="col-old">✕ ${oldWay}</td>
          <td class="col-lingoa">✓ ${lingoaWay}</td>
        </tr>
      `).join('');
    }

    // Render FAQ accordion
    const faqList = document.getElementById('faqList');
    if (faqList && dict.faqs) {
      faqList.innerHTML = dict.faqs.map(([q, a], idx) => `
        <div class="faq-item ${idx === 0 ? 'open' : ''}">
          <button type="button" class="faq-q" aria-expanded="${idx === 0 ? 'true' : 'false'}">
            <span>${q}</span>
            <span class="faq-chevron" aria-hidden="true">⌄</span>
          </button>
          <div class="faq-a" style="${idx === 0 ? 'max-height:240px' : ''}">
            <div class="faq-a-inner">${a}</div>
          </div>
        </div>
      `).join('');
      bindFaqEvents();
    }

    // Update gallery titles based on language
    document.querySelectorAll('.screen-tile').forEach((tile) => {
      const h4 = tile.querySelector('h4');
      const p = tile.querySelector('p');
      if (h4) h4.textContent = tile.getAttribute(STATE.lang === 'ar' ? 'data-title-ar' : 'data-title-en');
      if (p) p.textContent = tile.getAttribute(STATE.lang === 'ar' ? 'data-desc-ar' : 'data-desc-en');
    });

    // Sync quiz / result view with selected language
    if (STATE.quizFinished) {
      renderQuizResult();
    } else {
      STATE.answered = false;
      renderQuizQuestion();
    }
    renderFlashcard();
  }

  function bindFaqEvents() {
    document.querySelectorAll('.faq-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const panel = item.querySelector('.faq-a');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach((other) => {
          other.classList.remove('open');
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-a').style.maxHeight = null;
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  }

  /* ========================================================================
     9. Gallery Filter & Accessible Lightbox
     ======================================================================== */
  function filterGallery(filterKey) {
    document.querySelectorAll('.filter-pill').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-filter') === filterKey);
    });
    document.querySelectorAll('.screen-tile').forEach((tile) => {
      const cat = tile.getAttribute('data-cat');
      const isCore = tile.getAttribute('data-core') === 'true';
      const show = filterKey === 'all' || (filterKey === 'core' ? isCore : cat === filterKey);
      tile.classList.toggle('is-hidden', !show);
    });
  }

  function openLightbox(src, caption) {
    const lb = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImg');
    const cap = document.getElementById('lightboxCaption');
    if (!lb || !img) return;
    img.src = src;
    if (cap) cap.textContent = caption || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('lightboxModal');
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ========================================================================
     10. Initialization & Event Binding
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Wire all Google Play CTAs with live UTM attribution + event tracking
    document.querySelectorAll('[data-play-cta]').forEach((link) => {
      const placement = link.getAttribute('data-play-cta') || 'cta';
      link.href = window.buildLingoaPlayUrl(placement);
      link.addEventListener('click', () => {
        window.trackLingoaEvent('InitiateDownload', { placement });
      });
    });

    // 2. Determine initial language (?lang= > saved > default Arabic)
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    let savedLang = null;
    try { savedLang = localStorage.getItem('lingoa_lang'); } catch (_) {}
    const initialLang = (urlLang === 'en' || urlLang === 'ar') ? urlLang : (savedLang || 'ar');

    buildMarquee();
    applyLanguage(initialLang);
    filterGallery('core');

    // 3. Language toggle button
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        applyLanguage(STATE.lang === 'ar' ? 'en' : 'ar');
      });
    }

    // 4. Hero phone tabs & gentle auto-rotation
    document.querySelectorAll('.phone-tab').forEach((tab, idx) => {
      tab.addEventListener('click', () => switchHeroScreen(idx, true));
    });
    const heroPhone = document.getElementById('heroPhoneDevice');
    if (heroPhone) {
      heroPhone.addEventListener('click', () => {
        const cur = HERO_SCREENS[STATE.heroTabIdx];
        openLightbox(cur.src, STATE.lang === 'ar' ? cur.captionAr : cur.captionEn);
      });
    }
    STATE.heroAutoTimer = setInterval(() => {
      switchHeroScreen((STATE.heroTabIdx + 1) % HERO_SCREENS.length, false);
    }, 5200);

    // 5. Quiz controls
    const audioBtn = document.getElementById('quizAudioBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const q = window.LINGOA_QUIZ_SETS[STATE.quizSetIdx][STATE.qIdx];
        speakEnglish(q.word);
      });
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const set = window.LINGOA_QUIZ_SETS[STATE.quizSetIdx];
        if (STATE.qIdx < set.length - 1) {
          STATE.qIdx += 1;
          STATE.answered = false;
          renderQuizQuestion();
        } else {
          renderQuizResult();
        }
      });
    }

    const retryBtn = document.getElementById('quizRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => resetQuiz(true));
    }

    // Nasseh poke easter egg
    const nassehWrap = document.getElementById('nassehStageWrap');
    if (nassehWrap) {
      nassehWrap.addEventListener('click', () => {
        playTone('tap');
        setNassehMood(2);
        setTimeout(() => setNassehMood(STATE.quizFinished ? 5 : 1), 1300);
      });
    }

    // 6. 3D Flashcard demo interactions
    const flipScene = document.getElementById('flipScene');
    const flipBtn = document.getElementById('flipRevealBtn');
    const fcSpeakBtn = document.getElementById('fcSpeakBtn');
    const toggleFlip = () => {
      playTone('tap');
      STATE.flashFlipped = !STATE.flashFlipped;
      const el = document.getElementById('demoFlipCard');
      if (el) el.classList.toggle('flipped', STATE.flashFlipped);
    };
    if (flipScene) flipScene.addEventListener('click', toggleFlip);
    if (flipBtn) flipBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });
    if (fcSpeakBtn) {
      fcSpeakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakEnglish(window.LINGOA_FLASHCARDS[STATE.flashIdx].word);
      });
    }

    document.querySelectorAll('.fsrs-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTone('correct');
        const toast = document.getElementById('fsrsToast');
        if (toast) toast.textContent = window.LINGOA_I18N[STATE.lang].flipSavedToast;
        STATE.flashFlipped = false;
        STATE.flashIdx = (STATE.flashIdx + 1) % window.LINGOA_FLASHCARDS.length;
        setTimeout(renderFlashcard, 280);
      });
    });

    // 7. Gallery filters & screen tiles lightbox
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => filterGallery(pill.getAttribute('data-filter')));
    });

    document.querySelectorAll('.screen-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const img = tile.querySelector('img');
        const title = tile.getAttribute(STATE.lang === 'ar' ? 'data-title-ar' : 'data-title-en');
        if (img) openLightbox(img.src, title);
      });
    });

    document.querySelectorAll('[data-zoom-src]').forEach((el) => {
      el.addEventListener('click', () => {
        openLightbox(el.getAttribute('data-zoom-src'), el.getAttribute('data-zoom-cap') || '');
      });
    });

    const lbClose = document.getElementById('lightboxClose');
    const lbModal = document.getElementById('lightboxModal');
    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbModal) lbModal.addEventListener('click', (e) => { if (e.target === lbModal) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

    // 8. Bento card spotlight glow tracking
    document.querySelectorAll('.bento-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });

    // 9. Lazy-load Rive Robot when quiz approaches viewport
    const quizSection = document.getElementById('quiz');
    if ('IntersectionObserver' in window && quizSection) {
      const riveObs = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          initNassehRive();
          riveObs.disconnect();
        }
      }, { rootMargin: '320px' });
      riveObs.observe(quizSection);
    } else {
      initNassehRive();
    }

    // 10. Sticky Mobile CTA visibility once hero CTA scrolls off-screen
    const heroCtaGroup = document.getElementById('heroCtaGroup');
    const stickyBar = document.getElementById('stickyMobileCta');
    if ('IntersectionObserver' in window && heroCtaGroup && stickyBar) {
      const stickyObs = new IntersectionObserver((entries) => {
        stickyBar.classList.toggle('visible', !entries[0].isIntersecting);
      }, { threshold: 0.1 });
      stickyObs.observe(heroCtaGroup);
    }

    // 11. Progressive scroll reveal (never hides elements already visible or inside hash target)
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const vh = window.innerHeight || 800;
      const pendingEls = [];
      document.querySelectorAll('.reveal').forEach((el) => {
        if (el.closest('#quiz')) return; // Never hide interactive quiz (critical for #quiz ad deep links)
        const rect = el.getBoundingClientRect();
        if (rect.top > vh * 1.05) {
          el.classList.add('reveal-pending');
          pendingEls.push(el);
        }
      });

      if (pendingEls.length > 0) {
        const revObs = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('in-view');
              revObs.unobserve(en.target);
            }
          });
        }, { threshold: 0.01, rootMargin: '100px 0px' });
        pendingEls.forEach((el) => revObs.observe(el));

        // Fail-safe on hash navigation or fast scroll jumps
        window.addEventListener('hashchange', () => {
          pendingEls.forEach((el) => el.classList.add('in-view'));
        });
      }
    }
  });
})();
