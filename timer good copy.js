document.addEventListener("DOMContentLoaded", () => {
  let studentName = "";
   function submitForm() {
    studentName = document.getElementById("student-name").value.trim();
  }


  function shuffle(a) {
    return a
      .map((v) => ({ v, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((o) => o.v);
  }

  let quizzesData = {};
  fetch("questions.json")
    .then((res) => res.json())
    .then((data) => {
      quizzesData.English = data.EnglishTest;
      quizzesData.Technical = data.TechnicalTest;
      setupQuiz("English");
      setupQuiz("Technical");
    })
    .catch((err) => console.error("Error loading questions.json", err));

  function setupQuiz(name) {
    const section = document.getElementById(name);
    const startScreen = section.querySelector(".start");
    const startBtn = startScreen.querySelector("button");
    const questionList = section.querySelector(".question-list");
    const resultScreen = section.querySelector(".result");
    const resultHeading = resultScreen.querySelector(".heading");
    const restartBtn = resultScreen.querySelector("button");
    const progressBar = section.querySelector(".progress-bar");

    let questions = [],
      states = [],
      current = 0,
      score = 0,
      globalTime = 0,
      globalTimer = null;

    resultScreen.style.display = "none";

    function formatMMSS(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      return `${m}:${s}`;
    }

    function startGlobalTimer() {
      globalTime = 20 * 60; // 1200s
      globalTimer = setInterval(() => {
        globalTime--;
        // update the SVG progress and span
        const svg = section.querySelector(".question-progress svg");
        const span = section.querySelector(".question-progress span");
        if (svg) svg.style.setProperty("--progress", globalTime / 1200);
        if (span) span.textContent = formatMMSS(globalTime);

        if (globalTime <= 0) {
          clearInterval(globalTimer);
          showResult();
        }
      }, 1000);
    }

    function initRun() {
      const take = Math.min(15, quizzesData[name].length);
      questions = shuffle(quizzesData[name]).slice(0, take);
      states = Array(questions.length).fill(null);
      current = 0;
      score = 0;
      resultScreen.style.display = "none";
      clearInterval(globalTimer);
    }

    function renderQuestion(q, idx, st = {}) {
      const isLast = idx === questions.length - 1;
      const pct = globalTime / 1200;
      return `
<div class="collection-item ${st.answered ? "answered" : ""} ${st.notAnswered ? "not-answered" : ""}">
  <div class="question-number">${idx + 1}</div>
  <div class="question-head">
    <h2 class="heading">${sanitizeText(q.question)}</h2>
    <div class="question-progress">
      <svg viewBox="0 0 48 48" style="--progress:${pct};">
        <circle cx="24" cy="24" r="20"></circle>
      </svg>
      <span>${formatMMSS(globalTime)}</span>
    </div>
  </div>
  <div class="question-contain">
    ${q.options
      .map((o, optIdx) => {
        const sel = st.selectedIndex === optIdx ? "selected" : "";
        const corr = st.answered && o.correct ? "correct" : "";
        const inc = st.answered && sel && !o.correct ? "incorrect" : "";
        return `<a href="#" class="option-link ${sel} ${corr} ${inc}"
                  data-index="${optIdx}" data-correct="${o.correct}">
                  <h6 class="option-text">${sanitizeText(o.text)}</h6>
                  <div class="option-circle">
                    <i class="bi bi-x-lg x-icon"></i>
                    <i class="bi bi-check2 check-icon"></i>
                  </div>
                </a>`;
      })
      .join("")}
    <div class="explanation ${st.answered ? "show-copy" : ""}">
      <div class="answer_dot"></div>
      <p>${sanitizeText(q.explanation)}</p>
    </div>
    <div class="question-status">
      <p class="${st.answered ? "completed" : "notcompleted"}">
        ${st.answered ? "Completed" : "Not Completed"}
      </p>
    </div>
  </div>
  <div class="question-bottom" style="display:${st.answered ? "flex" : "none"}">
    <div style="display:flex; gap:1rem;">
      <button class="back-btn"><i class="bi bi-arrow-left"></i>Back</button>
      <button class="next-btn ${isLast ? "inactive" : ""}"><i class="bi bi-arrow-right"></i>Next</button>
    </div>
    <div>
      <button class="submit-btn" style="visibility:${idx >= 2 ? "visible" : "hidden"}">
        <i class="bi bi-flag"></i>Finish Quiz
      </button>
    </div>
  </div>
</div>`;
    }

    function showQuestion(i, fromBack = false) {
      if (i < 0 || i >= questions.length) return;
      current = i;
      const st = states[i] || {};
      questionList.innerHTML = renderQuestion(questions[i], i, st);
      bindOptions();
      updateProgress();
    }

    function bindOptions() {
      const item = section.querySelector(".collection-item");
      item.querySelectorAll(".option-link").forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.preventDefault();
          if (!item.classList.contains("answered")) {
            select(opt);
            lock(item);
          }
        });
      });
      item.querySelector(".next-btn").addEventListener("click", () => {
        showQuestion(current + 1);
      });
      item.querySelector(".submit-btn").addEventListener("click", () => {
        showResult();
      });
      item.querySelector(".back-btn").addEventListener("click", () =>
        showQuestion(current - 1, true)
      );
    }

    function select(opt) {
      const item = section.querySelector(".collection-item");
      const opts = item.querySelectorAll(".option-link");
      const exp = item.querySelector(".explanation");
      const bottom = item.querySelector(".question-bottom");
      const correct = opt.dataset.correct === "true";
      const para = item.querySelector(".question-status > p");

      opts.forEach((o) => {
        o.classList.remove("selected", "incorrect");
        if (o.dataset.correct === "true") o.classList.add("correct");
      });
      opt.classList.add("selected");
      if (!correct) opt.classList.add("incorrect");
      exp.classList.add("show-copy");
      bottom.style.display = "flex";
      para.textContent = "Completed";
      para.classList.replace("notcompleted", "completed");

      if (correct) score++;
      states[current] = {
        ...states[current],
        answered: true,
        selectedIndex: +opt.dataset.index,
      };

      // stop timer immediately if this was the last question
      if (current === questions.length - 1) {
        clearInterval(globalTimer);
      }
    }

    function lock(item) {
      item.classList.add("answered");
    }

    function updateProgress() {
      const pct = ((current + 1) / questions.length) * 100;
      progressBar.style.width = `${pct}%`;
    }

    function showResult() {
      clearInterval(globalTimer);
      resultHeading.textContent = `${studentName} Your result is ${score}/${questions.length}`;
      resultScreen.style.display = "flex";
      questionList.innerHTML = "";
    }

    startBtn.addEventListener("click", () => {
      submitForm();
      initRun();
      startScreen.style.display = "none";
      startGlobalTimer();
      showQuestion(0);
    });

    restartBtn.addEventListener("click", () => {
      initRun();
      startGlobalTimer();
      showQuestion(0);
    });
  }

  function sanitizeText(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
