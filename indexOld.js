document.addEventListener("DOMContentLoaded", () => {
  //Log message to confirm the script is running after the DOM is fully loaded

  console.log("Quiz: DOM Content Loaded");

  // Select the container that will hold the questions
  const questionList = document.querySelector(".question-list");

  // Select the start screen elements
  const startScreen = document.querySelector(".start");
  const startButton = startScreen.querySelector("button");
  // const studentName = document.getElementById("student-name");
  // Select the result screen elements
  const resultScreen = document.querySelector(".result");
  const resultHeading = resultScreen.querySelector(".heading");
  const restartButton = resultScreen.querySelector("button");

  // Select the progress bar element
  const progressBar = document.querySelector(".progress-bar");

  // Hide the result screen initially
  resultScreen.style.display = "none";

  // Variables to store quiz data
  let allTests = {}; //added this
  let selectedTestKey = "";//added this
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let totalQuestions = 0;
  let timerInterval = null;
  // helps with answered and unanswered questions 
  let questionStates = [];

  function shuffleArray(array) {
    return array
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  // Log message indicating the question loading process has started
  console.log("Quiz: Starting question load...");

  // Fetch questions from an external JSON file
  fetch("questiondemo.json")
    // Convert the response to JSON format
    .then((response) => response.json())
    .then((data) => {
      // Store the fetched questions in the 'questions' array
      // questions = data;
      // Shuffle and slice the first 15 questions
      questions = shuffleArray(data).slice(0, 15);

      // Get the total number of questions
      totalQuestions = questions.length;

      // Initialize question states to track user answers
      questionStates = new Array(totalQuestions).fill(null);

      // Update the start screen heading to display the total number of questions
      startScreen.querySelector(
        ".heading"
      ).textContent = `We have total ${totalQuestions} questions.`;

      // Log the total number of questions loaded
      console.log(`Quiz: Loaded ${totalQuestions} questions`);
      console.table(questions);
    })
    .catch((error) => console.error("Error loading question", error));

  // Event listeners
  startButton.addEventListener("click", () => {
    console.log("Quiz: Start button clicked");
    startScreen.style.display = "none";
    showQuestion(0);
  });
  restartButton.addEventListener("click", () => {
    console.log("Quiz: Restart button clicked");
    resultScreen.style.display = "none";
    currentQuestionIndex = 0;
    score = 0;
    questionStates = new Array(totalQuestions).fill(null);
    showQuestion(0);
  });
  function showQuestion(index, isNavigatingBack = false) {
    console.log(`Quiz: Showing question ${index + 1}/${totalQuestions}`);

    // checks wether the index is outside the valid range 
    if (index < 0 || index >= totalQuestions) return;

    clearInterval(timerInterval);
    // ensures that the user's progress is saved - including selected answers and remaining time
    // saveQuestionState(currentQuestionIndex);

    currentQuestionIndex = index;
    // restore the user progress if they previously attempted this question 
    const existingState = questionStates[index];

    questionList.innerHTML = createQuestionHTML(
      questions[index],
      index,
      existingState
    );
    addOptionListeners();

    if (existingState) {
      console.log(`Quiz: Restoring state for question ${index + 1}`);
      restoreQuestionState(index, existingState);
      if (existingState.answered) lockQuestion();
    } else if (!isNavigatingBack) {
      console.log(`Quiz: Starting fresh question ${index + 1}`);
      startTimer(index, existingState?.timeLeft);
    }

    updateProgress();
    // toggleBackButton();
  }

  function updateProgress() {
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    progressBar.style.width = `${progressPercent}%`;
  }

  function addOptionListeners() {
    console.log("Quiz: Adding option listeners");
    const collectionItem = document.querySelector(".collection-item");
    const options = collectionItem?.querySelectorAll(".option-link");
    const nextButton = collectionItem?.querySelector(".next-btn");
    const backButton = collectionItem?.querySelector(".back-btn");

    // ensures that listeners are only added to unanswered questions
    // also prevent change the answers once the question marked as complete
    if (!collectionItem?.classList.contains("answered")) {
      options?.forEach((option) => {
        console.log("Option Clicked");
        option.addEventListener("click", handleAnswerClick);
      });
    }
    nextButton?.addEventListener("click", () => {

      // if (!validateNavigation()) return;//navigate forward- function will stop running 
      if (currentQuestionIndex === totalQuestions - 1) {
        showResult();
      } else {
        showQuestion(currentQuestionIndex + 1);
      }
    });
    backButton?.addEventListener("click", () =>
      showQuestion(currentQuestionIndex - 1, true)
    );
  }
  function validateNavigation() {
    // Allow navigation only if the current question is answered
    // return questionStates[currentQuestionIndex]?.answered;
  }
  function createQuestionHTML(q, index, existingState) {
    console.log(`Quiz: Generating HTML for question ${index + 1}`);
    const isLastQuestion = index === totalQuestions - 1; //for next or finish button
    return `<div role="listitem" class="collection-item
    ${existingState?.answered ? "answered" : ""}
    ${existingState?.notAnswered ? "not-answered" : ""}">
              <div class="question-number">${index + 1}</div>
              <div class="question-head">
                <h2 class="heading">
                  ${sanitizeText(q.question)}
                </h2>
                <div class="question-progress" >
                  <svg viewBox="0 0 48 48" style="--progress: ${
                    existingState?.timeLeft
                      ? existingState.timeLeft / parseInt(q.time)
                      : 1
                  };">
                    <circle cx="24" cy="24" r="20"></circle>
                  </svg>
                  <span>${existingState?.timeLeft ?? q.time}</span>
                </div>
              </div>
              <div class="question-contain">
              ${q.options
                .map((opt, optIndex) => {
                  const isSelected = existingState?.selectedIndex === optIndex;
                  const isCorrect = opt.correct;
                  const showIncorrect =
                    existingState?.answered && isSelected && !isCorrect;
                  const showCorrect = existingState?.answered && isCorrect;
                  return `<a
                  href="#"
                  class="option-link
                  ${isSelected ? "selected" : ""}
                  ${showCorrect ? "correct" : ""}
                  ${showIncorrect ? "incorrect" : ""}"
                  data-correct="${opt.correct}"
                  data-index="${optIndex}"
                >
                  <h6 class="option-text">${sanitizeText(opt.text)}</h6>
                  <div class="option-circle">
                    <i class="bi bi-x-lg x-icon"></i>
                    <i class="bi bi-check2 check-icon"></i>
                  </div>
                </a>`;
                })

                .join("")}
                
                <div class="explanation ${
                  existingState?.answered ? "show-copy" : ""
                }">
                  <div class="answer_dot"></div>
                  <p>
                    ${sanitizeText(q.explanation)}
                  </p>
                </div>
              </div>
              <div class="question-bottom" style="display: ${
                existingState?.answered ? "flex" : "none"
              }">
                <button class="back-btn">
                  <i class="bi bi-arrow-left"></i>
                  Back
                </button>
                <button class="next-btn">
                ${isLastQuestion ? "Finish Quiz" : "Next"}
                  <i class="bi ${
                    isLastQuestion ? "bi-flag" : "bi-arrow-right"
                  } "></i>
                </button>
              </div>
            </div>`;
  }
  function sanitizeText(text) {
    console.log("Quiz: Sanitizing text");
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");}

  function handleAnswerClick(e) {
    e.preventDefault();
    const option = e.currentTarget;
    const collectionItem = option.closest(".collection-item");

    if (!collectionItem.classList.contains("answered")) {
      handleAnswerSelection(option);
      lockQuestion();
    }
  }

  function handleAnswerSelection(option, isUserAction = true) {
    console.log(`Quiz: Locking question ${currentQuestionIndex + 1}`);
    const collectionItem = option.closest(".collection-item");
    const options = collectionItem.querySelectorAll(".option-link");
    const explanation = collectionItem.querySelector(".explanation");
    const nextButtonContainer =
      collectionItem.querySelector(".question-bottom");
    const isCorrect = option.dataset.correct === "true";

    options.forEach((opt) => {
      opt.classList.remove("selected", "incorrect");
      if (opt.dataset.correct === "true") {
        // Compare as string
        opt.classList.add("correct");
      }
    });

    option.classList.add("selected");
    if (!isCorrect) option.classList.add("incorrect");

    explanation.classList.add("show-copy");
    nextButtonContainer.style.display = "flex";

    // Only increase score for user actions
    if (isCorrect && isUserAction) score++;

    questionStates[currentQuestionIndex] = {
      ...questionStates[currentQuestionIndex],
      answered: true,
      selectedIndex: parseInt(option.dataset.index),
      timeLeft: parseInt(
        document.querySelector(".question-progress span").textContent
      ),
    };
    clearInterval(timerInterval);
  }

  function lockQuestion() {
    console.log("Quiz: Answer option clicked");
    const collectionItem = document.querySelector(".collection-item");
    collectionItem.classList.add("answered");

    const options = collectionItem?.querySelectorAll(".option-link");
    options?.forEach((option) => {
      option.removeEventListener("click", handleAnswerClick);
    });
  }

  function startTimer(index, initialTime) {
    console.log(`Quiz: Starting timer for question ${index + 1}`);
    const totalTime =
      initialTime || parseInt(questions[index].time.replace("s", ""));
    const progressElement = document.querySelector(".question-progress svg");
    const timeDisplay = document.querySelector(".question-progress span");
    let remainingTime = totalTime;

    timerInterval = setInterval(() => {
      console.log(`Quiz: Time remaining: ${remainingTime}s`);
      if (questionStates[index]?.answered) {
        clearInterval(timerInterval);
        return;
      }

      remainingTime--;
      timeDisplay.textContent = `${remainingTime}s`;
      progressElement.style.setProperty(
        "--progress",
        remainingTime / totalTime
      );

      if (remainingTime <= 0) {
        console.log(`Quiz: Time expired for question ${index + 1}`);
        clearInterval(timerInterval);
        autoSubmitAnswer(index);
      }

      questionStates[index] = {
        ...questionStates[index],
        timeLeft: remainingTime,
      };
    }, 1000);
  }

  function autoSubmitAnswer(index) {
    console.log(`Quiz: Auto-submitting answer for question ${index + 1}`);
    const collectionItem = document.querySelector(".collection-item");

    if (!collectionItem?.classList.contains("answered")) {
      const correctOption = document.querySelector(
        `.option-link[data-correct = "true"]`
      );
      if (correctOption) {
        // Pass false to indicate automatic selection
        handleAnswerSelection(correctOption, false);
        lockQuestion();
        // Add not-answered class
        collectionItem.classList.add("not-answered");
        questionStates[index].notAnswered = true;
      }
    }
  }
  function showResult() {
    console.log("Quiz: Showing result screen");
    resultHeading.textContent = `Your result is ${score}/${totalQuestions}`;
    resultScreen.style.display = "flex";
    questionList.innerHTML = ""; // Clear questions
  }
});

// English questions
const englishQuestions = [
  {
    id: 1,
    question: "Choose the correct form: She ____ to school every day.",
    choices: { a: "go", b: "goes", c: "gone", d: "going" },
    correctAnswer: "b",
  },
  {
    id: 2,
    question: "Which sentence is grammatically correct?",
    choices: {
      a: "He don't like pizza.",
      b: "He doesn't likes pizza.",
      c: "He doesn't like pizza.",
      d: "He not like pizza.",
    },
    correctAnswer: "c",
  },
  {
    id: 3,
    question: "What is the past tense of 'run'?",
    choices: { a: "runned", b: "ran", c: "runned", d: "run" },
    correctAnswer: "b",
  },
  {
    id: 4,
    question: "Identify the synonym of 'happy':",
    choices: { a: "sad", b: "angry", c: "joyful", d: "tired" },
    correctAnswer: "c",
  },
  {
    id: 5,
    question: "Choose the correct article: I saw ____ elephant.",
    choices: { a: "a", b: "an", c: "the", d: "no article" },
    correctAnswer: "b",
  },
  {
    id: 6,
    question: "Which word is an adjective?",
    choices: { a: "quickly", b: "run", c: "beautiful", d: "softly" },
    correctAnswer: "c",
  },
  {
    id: 7,
    question: "Which sentence is in passive voice?",
    choices: {
      a: "The boy kicked the ball.",
      b: "She eats an apple.",
      c: "The cake was eaten by Tom.",
      d: "I will call you.",
    },
    correctAnswer: "c",
  },
  {
    id: 8,
    question: "What is the plural form of 'child'?",
    choices: { a: "childs", b: "children", c: "childes", d: "childrens" },
    correctAnswer: "b",
  },
  {
    id: 9,
    question: "Choose the correct form: They ____ working now.",
    choices: { a: "is", b: "are", c: "was", d: "am" },
    correctAnswer: "b",
  },
  {
    id: 10,
    question: "Which is a conjunction?",
    choices: { a: "quick", b: "and", c: "apple", d: "happy" },
    correctAnswer: "b",
  },
  {
    id: 11,
    question: "What type of word is 'slowly'?",
    choices: { a: "noun", b: "verb", c: "adverb", d: "adjective" },
    correctAnswer: "c",
  },
  {
    id: 12,
    question: "Choose the correct spelling:",
    choices: {
      a: "definately",
      b: "definitely",
      c: "definitly",
      d: "defanately",
    },
    correctAnswer: "b",
  },
  {
    id: 13,
    question: "Which sentence uses the correct preposition?",
    choices: {
      a: "He is good in math.",
      b: "He is good at math.",
      c: "He is good for math.",
      d: "He is good on math.",
    },
    correctAnswer: "b",
  },
  {
    id: 14,
    question: "Choose the correct verb form: She ____ already eaten.",
    choices: { a: "has", b: "have", c: "having", d: "had" },
    correctAnswer: "a",
  },
  {
    id: 15,
    question: "Which is a compound word?",
    choices: { a: "sunlight", b: "light", c: "sun", d: "bright" },
    correctAnswer: "a",
  },
  {
    id: 16,
    question: "Find the antonym of 'strong':",
    choices: { a: "powerful", b: "tough", c: "weak", d: "bold" },
    correctAnswer: "c",
  },
  {
    id: 17,
    question: "What is the superlative form of 'good'?",
    choices: { a: "goodest", b: "more good", c: "best", d: "better" },
    correctAnswer: "c",
  },
  {
    id: 18,
    question: "Choose the correct sentence:",
    choices: {
      a: "I has a book.",
      b: "I have a book.",
      c: "I haves a book.",
      d: "I had have a book.",
    },
    correctAnswer: "b",
  },
  {
    id: 19,
    question: "What is the noun in this sentence: 'The dog barked loudly.'",
    choices: { a: "barked", b: "loudly", c: "dog", d: "the" },
    correctAnswer: "c",
  },
  {
    id: 20,
    question: "Choose the correct form: He is taller ____ me.",
    choices: { a: "than", b: "then", c: "that", d: "to" },
    correctAnswer: "a",
  },
  {
    id: 21,
    question: "Which sentence is interrogative?",
    choices: {
      a: "Close the door.",
      b: "Where is the book?",
      c: "The book is on the table.",
      d: "He is reading.",
    },
    correctAnswer: "b",
  },
  {
    id: 22,
    question: "Find the past participle of 'write':",
    choices: { a: "writed", b: "wrote", c: "written", d: "write" },
    correctAnswer: "c",
  },
  {
    id: 23,
    question: "Which sentence is correct?",
    choices: {
      a: "Their going to the store.",
      b: "They're going to the store.",
      c: "There going to the store.",
      d: "Theyre going to the store.",
    },
    correctAnswer: "b",
  },
  {
    id: 24,
    question: "Identify the verb: 'She dances beautifully.'",
    choices: { a: "She", b: "dances", c: "beautifully", d: "none" },
    correctAnswer: "b",
  },
  {
    id: 25,
    question: "What is the plural of 'mouse'?",
    choices: { a: "mouses", b: "mices", c: "mice", d: "mouse" },
    correctAnswer: "c",
  },
  {
    id: 26,
    question: "Which of these is an interjection?",
    choices: { a: "Wow!", b: "Quickly", c: "Blue", d: "Swim" },
    correctAnswer: "a",
  },
  {
    id: 27,
    question: "Which sentence uses future tense?",
    choices: {
      a: "He is playing.",
      b: "He will play.",
      c: "He played.",
      d: "He plays.",
    },
    correctAnswer: "b",
  },
  {
    id: 28,
    question: "Find the correct possessive form: The ____ toys are new.",
    choices: { a: "child", b: "childs", c: "child's", d: "children's" },
    correctAnswer: "d",
  },
  {
    id: 29,
    question: "Choose the correct homophone: I went ____ the park.",
    choices: { a: "to", b: "too", c: "two", d: "toe" },
    correctAnswer: "a",
  },
  {
    id: 30,
    question: "Which sentence is correct?",
    choices: {
      a: "Its raining outside.",
      b: "It’s raining outside.",
      c: "Its’ raining outside.",
      d: "It raining outside.",
    },
    correctAnswer: "b",
  },
];

//   Technical questions
const technicalQuestions = [
  {
    id: 1,
    question: "What does HTML stand for?",
    choices: {
      a: "Hyperlinks and Text Markup Language",
      b: "Home Tool Markup Language",
      c: "Hyper Text Markup Language",
      d: "Hyperlink Text Management Language",
    },
    correctAnswer: "c",
  },
  {
    id: 2,
    question: "Which language is used for styling web pages?",
    choices: { a: "HTML", b: "JQuery", c: "CSS", d: "XML" },
    correctAnswer: "c",
  },
  {
    id: 3,
    question: "Inside which HTML element do we put the JavaScript?",
    choices: { a: "<js>", b: "<scripting>", c: "<javascript>", d: "<script>" },
    correctAnswer: "d",
  },
  {
    id: 4,
    question: "What does CSS stand for?",
    choices: {
      a: "Computer Style Sheets",
      b: "Creative Style Sheets",
      c: "Cascading Style Sheets",
      d: "Colorful Style Sheets",
    },
    correctAnswer: "c",
  },
  {
    id: 5,
    question: "Which symbol is used for comments in JavaScript?",
    choices: { a: "//", b: "/*", c: "#", d: "<!--" },
    correctAnswer: "a",
  },
  {
    id: 6,
    question: "Which HTML tag is used to define an unordered list?",
    choices: { a: "<ul>", b: "<ol>", c: "<li>", d: "<list>" },
    correctAnswer: "a",
  },
  {
    id: 7,
    question: "Which is NOT a JavaScript data type?",
    choices: { a: "String", b: "Number", c: "Boolean", d: "Float" },
    correctAnswer: "d",
  },
  {
    id: 8,
    question: "What does HTTP stand for?",
    choices: {
      a: "HyperText Transfer Protocol",
      b: "HighText Transfer Protocol",
      c: "HyperText Transmission Protocol",
      d: "HyperText Transfer Program",
    },
    correctAnswer: "a",
  },
  {
    id: 9,
    question: "Which company developed JavaScript?",
    choices: { a: "Microsoft", b: "Google", c: "Netscape", d: "Oracle" },
    correctAnswer: "c",
  },
  {
    id: 10,
    question: "How do you write 'Hello World' in an alert box?",
    choices: {
      a: "alertBox('Hello World');",
      b: "msg('Hello World');",
      c: "alert('Hello World');",
      d: "msgBox('Hello World');",
    },
    correctAnswer: "c",
  },
  {
    id: 11,
    question: "Which HTML tag is used to define a table row?",
    choices: { a: "<row>", b: "<td>", c: "<th>", d: "<tr>" },
    correctAnswer: "d",
  },
  {
    id: 12,
    question: "What is the correct file extension for JavaScript files?",
    choices: { a: ".js", b: ".java", c: ".script", d: ".javascript" },
    correctAnswer: "a",
  },
  {
    id: 13,
    question: "Which keyword is used to declare a constant in JavaScript?",
    choices: { a: "var", b: "const", c: "let", d: "constant" },
    correctAnswer: "b",
  },
  {
    id: 14,
    question: "What does DOM stand for?",
    choices: {
      a: "Document Object Model",
      b: "Display Object Management",
      c: "Digital Ordinance Model",
      d: "Desktop Oriented Mode",
    },
    correctAnswer: "a",
  },
  {
    id: 15,
    question: "Which built-in method removes the last element from an array?",
    choices: { a: "last()", b: "pop()", c: "remove()", d: "delete()" },
    correctAnswer: "b",
  },
  {
    id: 16,
    question: "Which of these is a backend language?",
    choices: { a: "HTML", b: "CSS", c: "Node.js", d: "Bootstrap" },
    correctAnswer: "c",
  },
  {
    id: 17,
    question: "What is a correct syntax to output in console in JavaScript?",
    choices: {
      a: "print('Hello')",
      b: "console.log('Hello')",
      c: "echo 'Hello'",
      d: "log.console('Hello')",
    },
    correctAnswer: "b",
  },
  {
    id: 18,
    question: "Which of these is used to structure a web page?",
    choices: { a: "HTML", b: "CSS", c: "JavaScript", d: "React" },
    correctAnswer: "a",
  },
  {
    id: 19,
    question: "Which operator is used to compare both value and type?",
    choices: { a: "==", b: "===", c: "=", d: "!==" },
    correctAnswer: "b",
  },
  {
    id: 20,
    question: "How do you define a function in JavaScript?",
    choices: {
      a: "function myFunc()",
      b: "def myFunc()",
      c: "func myFunc()",
      d: "function:myFunc()",
    },
    correctAnswer: "a",
  },
  {
    id: 21,
    question: "What is the output of 2 + '2' in JavaScript?",
    choices: { a: "4", b: "22", c: "NaN", d: "Error" },
    correctAnswer: "b",
  },
  {
    id: 22,
    question: "What tag is used to link a CSS file in HTML?",
    choices: { a: "<style>", b: "<css>", c: "<link>", d: "<script>" },
    correctAnswer: "c",
  },
  {
    id: 23,
    question: "Which command initializes a new Git repository?",
    choices: {
      a: "git start",
      b: "git init",
      c: "git create",
      d: "git new",
    },
    correctAnswer: "b",
  },
  {
    id: 24,
    question: "What is the purpose of 'npm'?",
    choices: {
      a: "A database management tool",
      b: "A JavaScript compiler",
      c: "Node Package Manager",
      d: "A CSS framework",
    },
    correctAnswer: "c",
  },
  {
    id: 25,
    question: "What is the default port for HTTP?",
    choices: { a: "80", b: "22", c: "443", d: "21" },
    correctAnswer: "a",
  },
  {
    id: 26,
    question: "Which tool is used for version control?",
    choices: { a: "VS Code", b: "Git", c: "Nginx", d: "Docker" },
    correctAnswer: "b",
  },
  {
    id: 27,
    question: "Which HTML tag is used to create a hyperlink?",
    choices: { a: "<a>", b: "<link>", c: "<href>", d: "<url>" },
    correctAnswer: "a",
  },
  {
    id: 28,
    question: "Which protocol is used to encrypt data on the web?",
    choices: { a: "HTTP", b: "TCP", c: "FTP", d: "HTTPS" },
    correctAnswer: "d",
  },
  {
    id: 29,
    question: "Which of these is a JavaScript framework?",
    choices: { a: "Laravel", b: "Spring", c: "React", d: "Django" },
    correctAnswer: "c",
  },
  {
    id: 30,
    question: "Which tag is used to create a form in HTML?",
    choices: { a: "<input>", b: "<form>", c: "<action>", d: "<submit>" },
    correctAnswer: "b",
  },
];
