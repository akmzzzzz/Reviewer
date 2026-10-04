// ==========================================
// GLOBAL STATE & THEME LOGIC
// ==========================================
let activeFilter = "ALL";
let filteredQuestions = [];
let currentIndex = 0;
let userAnswers = {};

function toggleTheme() {
  const cur = document.body.getAttribute("data-theme");
  document.body.setAttribute("data-theme", cur === "light" ? "dark" : "light");
}

// Fisher-Yates Shuffle Algorithm to randomize questions
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ==========================================
// QUIZ ENGINE INITIALIZATION
// ==========================================
function init() {
  // If there is no 'questions' array on this page (e.g., Master Directories), stop the quiz engine but allow the theme toggle to work.
  if (typeof questions === 'undefined') return;

  buildCategoryFilters();
  filterQuestionSet();

  // Setup 'Enter' key submission for Identification questions (if the element exists)
  const identInput = document.getElementById("ident-input");
  if (identInput) {
    identInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        const checkBtn = document.getElementById("check-btn");
        if (checkBtn && checkBtn.style.display !== "none") {
          checkIdentAnswer();
        } else {
          nextQuestion();
        }
      }
    });
  }
}

// ==========================================
// FILTERING & GRID LOGIC
// ==========================================
function buildCategoryFilters() {
  const container = document.getElementById("category-filters");
  if (!container) return;
  
  container.innerHTML = "";
  const categories = ["ALL", ...new Set(questions.map(q => q.category))];
  
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = `filter-btn ${cat === activeFilter ? "active" : ""}`;
    btn.textContent = cat === "ALL" ? `All Topics (${questions.length})` : cat;
    btn.onclick = () => { activeFilter = cat; filterQuestionSet(); buildCategoryFilters(); };
    container.appendChild(btn);
  });
}

function filterQuestionSet() {
  let pool = activeFilter !== "ALL" ? questions.filter(q => q.category === activeFilter) : [...questions];
  filteredQuestions = shuffleArray([...pool]); 
  currentIndex = 0; 
  userAnswers = {}; 
  initGrid(); 
  renderQuestion();
}

function initGrid() {
  const grid = document.getElementById("grid-jump");
  if (!grid) return;
  
  grid.innerHTML = "";
  filteredQuestions.forEach((_, idx) => {
    const btn = document.createElement("button");
    btn.className = "grid-btn"; 
    btn.textContent = idx + 1;
    btn.onclick = () => jumpToQuestion(idx);
    grid.appendChild(btn);
  });
}

function updateGridStyles() {
  const btns = document.querySelectorAll(".grid-btn");
  btns.forEach((btn, idx) => {
    btn.className = "grid-btn";
    if (idx === currentIndex) btn.classList.add("current");
    
    if (userAnswers[idx] !== undefined) {
      if (userAnswers[idx].isCorrect) btn.classList.add("answered-correct");
      else btn.classList.add("answered-wrong");
    }
  });
}

// ==========================================
// RENDERING & INTERACTION LOGIC
// ==========================================
function renderQuestion() {
  if (filteredQuestions.length === 0) return;

  const item = filteredQuestions[currentIndex];
  const qType = item.type || "mcq"; // Fallback to Multiple Choice for Chapters 1 & 2
  const hasAnswered = userAnswers[currentIndex] !== undefined;

  // Update Badges & Text (Null-safe for older HTML structures)
  const catBadge = document.getElementById("cat-badge");
  if (catBadge) catBadge.textContent = item.category;
  
  const typeBadge = document.getElementById("type-badge");
  if (typeBadge) typeBadge.textContent = qType === "mcq" ? "Multiple Choice" : "Identification";
  
  const qText = document.getElementById("question-text");
  if (qText) qText.textContent = item.q;
  
  const qInd = document.getElementById("question-indicator");
  if (qInd) qInd.textContent = `Question ${currentIndex + 1} of ${filteredQuestions.length}`;

  // UI Elements
  const optionsBox = document.getElementById("options-box");
  const identBox = document.getElementById("ident-box");
  const identInput = document.getElementById("ident-input");
  const checkBtn = document.getElementById("check-btn");
  const nextBtn = document.getElementById("next-btn");
  const expBox = document.getElementById("explanation-box");

  if (expBox) {
    expBox.className = "explanation-panel";
    expBox.innerHTML = "";
  }

  // Render MCQ or Identification
  if (qType === "mcq") {
    if (optionsBox) {
      optionsBox.style.display = "flex";
      optionsBox.innerHTML = "";
      item.options.forEach((opt, idx) => {
        const div = document.createElement("div");
        div.className = "option-item";
        if (hasAnswered) div.classList.add("disabled");

        div.innerHTML = `<span class="option-key">${String.fromCharCode(65 + idx)}.</span><span>${opt}</span>`;

        if (hasAnswered) {
          if (idx === item.answer) div.classList.add("correct");
          if (userAnswers[currentIndex].choice === idx && idx !== item.answer) div.classList.add("wrong");
        } else {
          div.onclick = () => selectMcqAnswer(idx, opt);
        }
        optionsBox.appendChild(div);
      });
    }
    if (identBox) identBox.style.display = "none";

    if (hasAnswered) {
      if (nextBtn) nextBtn.style.display = "block";
      showExplanation(userAnswers[currentIndex].isCorrect, item.options[item.answer], item.note, false);
    } else {
      if (nextBtn) nextBtn.style.display = "none";
    }
  } else {
    if (optionsBox) optionsBox.style.display = "none";
    if (identBox) identBox.style.display = "flex";

    if (hasAnswered) {
      if (identInput) {
        identInput.value = userAnswers[currentIndex].text;
        identInput.disabled = true;
      }
      if (checkBtn) checkBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "block";
      showExplanation(userAnswers[currentIndex].isCorrect, item.displayAnswer, item.note, true);
    } else {
      if (identInput) {
        identInput.value = "";
        identInput.disabled = false;
        identInput.focus();
      }
      if (checkBtn) checkBtn.style.display = "block";
      if (nextBtn) nextBtn.style.display = "none";
    }
  }

  // Update Nav & Score
  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  
  if (nextBtn) nextBtn.textContent = (currentIndex === filteredQuestions.length - 1) ? "Finish & Review" : "Next →";

  const answeredKeys = Object.keys(userAnswers);
  const corrCount = answeredKeys.filter(k => userAnswers[k].isCorrect).length;
  
  const scoreInd = document.getElementById("score-indicator");
  if (scoreInd) scoreInd.textContent = `Score: ${corrCount} / ${answeredKeys.length}`;
  
  const progBar = document.getElementById("progress-bar");
  if (progBar) progBar.style.width = `${((currentIndex + 1) / filteredQuestions.length) * 100}%`;

  updateGridStyles();
}

function selectMcqAnswer(selectedIdx, optText) {
  if (userAnswers[currentIndex] !== undefined) return;
  const item = filteredQuestions[currentIndex];
  userAnswers[currentIndex] = {
    type: "mcq",
    choice: selectedIdx,
    text: optText,
    isCorrect: (selectedIdx === item.answer)
  };
  renderQuestion();
}

function checkIdentAnswer() {
  const inputEl = document.getElementById("ident-input");
  if (!inputEl) return;
  
  const userText = inputEl.value.trim().toLowerCase();
  if (userText === "") return;

  const item = filteredQuestions[currentIndex];
  let isCorrect = item.accepted.some(ans => userText.includes(ans.toLowerCase()));

  userAnswers[currentIndex] = {
    type: "ident",
    text: inputEl.value,
    isCorrect: isCorrect
  };
  renderQuestion();
}

function showExplanation(isCorrect, displayAnswer, note, allowOverride) {
  const expBox = document.getElementById("explanation-box");
  if (!expBox) return;
  
  expBox.classList.add("show", isCorrect ? "correct" : "wrong");

  let html = `<strong>${isCorrect ? "✓ Correct!" : "✗ Incorrect."}</strong><br/>`;
  if (!isCorrect) html += `<strong>Correct Answer:</strong> ${displayAnswer}<br/><br/>`;
  html += `<small>${note}</small>`;

  if (!isCorrect && allowOverride) {
    html += `<br/><button class="override-btn" onclick="overrideGrade()">I got this right (Override)</button>`;
  }
  expBox.innerHTML = html;
}

function overrideGrade() {
  if (userAnswers[currentIndex]) {
    userAnswers[currentIndex].isCorrect = true;
    renderQuestion();
  }
}

// ==========================================
// NAVIGATION & SUMMARY
// ==========================================
function jumpToQuestion(idx) { currentIndex = idx; renderQuestion(); }
function prevQuestion() { if (currentIndex > 0) { currentIndex--; renderQuestion(); } }

function nextQuestion() {
  if (currentIndex < filteredQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    document.getElementById("quiz-card").style.display = "none";
    document.getElementById("summary-card").style.display = "block";

    const total = filteredQuestions.length;
    const answeredKeys = Object.keys(userAnswers);
    const corr = answeredKeys.filter(k => userAnswers[k].isCorrect).length;
    const pct = Math.round((corr / total) * 100) || 0;

    document.getElementById("final-score-display").textContent = `${pct}% (${corr}/${total})`;
    document.getElementById("final-remark").textContent = pct >= 80 ? "Superb mastery!" : "Review your notes and try again.";

    const reviewBox = document.getElementById("review-container");
    if (!reviewBox) return;
    
    reviewBox.innerHTML = "";
    filteredQuestions.forEach((item, idx) => {
      const uAns = userAnswers[idx];
      const isCorr = uAns ? uAns.isCorrect : false;
      const d = document.createElement("div");
      d.className = `review-item ${isCorr ? "pass" : "fail"}`;

      const qType = item.type || "mcq";
      const correctStr = qType === "mcq" ? item.options[item.answer] : item.displayAnswer;

      d.innerHTML = `
        <strong>Q${idx + 1}: ${item.q}</strong><br/>
        <span style="color:${isCorr ? "var(--correct-text)" : "var(--wrong-text)"}">
          Your Answer: ${uAns ? uAns.text : "Unanswered"}
        </span><br/>
        ${!isCorr ? `Correct Answer: <strong>${correctStr}</strong><br/>` : ''}
        <small style="color:var(--text-muted);">${item.note}</small>
      `;
      reviewBox.appendChild(d);
    });
  }
}

function resetQuiz() {
  userAnswers = {}; 
  currentIndex = 0;
  document.getElementById("summary-card").style.display = "none";
  document.getElementById("quiz-card").style.display = "block";
  renderQuestion();
}

window.onload = init;