/** Fallback quiz when ANTHROPIC_API_KEY is not set (beta / local dev). */
export function buildDemoQuiz(title: string, author: string) {
  const t = title.slice(0, 40);
  const a = author.slice(0, 30);
  return {
    mock: true,
    questions: [
      {
        question: `Who wrote "${t}"?`,
        options: [`A. ${a}`, "B. Someone else", "C. A robot", "D. Nobody knows"],
        correct: "A",
      },
      {
        question: "Why do we read books?",
        options: [
          "A. To learn and have fun",
          "B. To make soup",
          "C. To fly airplanes",
          "D. To sleep less",
        ],
        correct: "A",
      },
      {
        question: "What is a main character?",
        options: [
          "A. An important person in the story",
          "B. The book cover",
          "C. The library building",
          "D. A type of pencil",
        ],
        correct: "A",
      },
      {
        question: "What might happen at the end of a story?",
        options: ["A. The ending", "B. The beginning again", "C. A sandwich", "D. Nothing ever"],
        correct: "A",
      },
      {
        question: "How can you enjoy reading more?",
        options: [
          "A. Read a little every day",
          "B. Never turn pages",
          "C. Hide the book",
          "D. Skip all the words",
        ],
        correct: "A",
      },
    ],
  };
}
