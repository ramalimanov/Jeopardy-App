// The URL of the API.
const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";

// Game configuration
const NUM_CATEGORIES = 6; //The number of categories you will be fetching. You can change this number.
const NUM_CLUES = 5; // The number of clues you will be displaying per category. You can change this number.

// Game state variables
let categories = []; // Holds categories and their clues
let activeClue = null; // Currently selected clue data.
let activeClueMode = 0; // 0. Idle. 1. Question shown 2.Answer shown.Controls the flow of #active-clue element
// while selecting a clue, displaying the question of selected clue, and displaying the answer to the question.
let score = 0; // Score start from zero
/*
0: Empty. Waiting to be filled. If a clue is clicked, it shows the question (transits to 1).
1: Showing a question. If the question is clicked, it shows the answer (transits to 2).
2: Showing an answer. If the answer is clicked, it empties (transits back to 0).
 */

// Button for event handlers
$("#play").on("click", setupTheGame);
$("#reset").on("click", resetGame);
$("#active-clue").on("click", handleActiveClueClick);

// Start the game
// Using await function fo it to wait asynchronous operations (like API calls or delays) to complete.
async function setupTheGame() {
  //Using setupTheGame responsible for preparing everything needed to start or restart the game.
  $("#play").prop("disabled", true);
  $("#reset").prop("disabled", false);
  score = 0;
  updateScore();
  categories = [];
  await loadGame();
}

// Reset everything and starting over game again.
function resetGame() {
  $("#play").prop("disabled", false).text("Start Game"); // Making the button clickable again.
  $("#reset").prop("disabled", true);
  categories = [];
  activeClue = null;
  activeClueMode = 0;
  score = 0;
  updateScore();
  $("#categories, #clues").empty();
  $("#active-clue").text("Click on a clue to begin!");
}

// Load and setup the game.
// This function that loads and prepares all the data needed to render the game board — like fetching categories and clues, and then displaying them.
async function loadGame() {
  $("#active-clue").text("Loading...");
  try {
    const ids = await getCategoryIds();
    for (const id of ids) {
      const c = await getCategoryData(id);
      categories.push(c);
    }
    renderTable();
    $("#active-clue").text("Click on a clue to begin!");
  } catch (err) {
    console.error(err);
    $("#active-clue").text("Failed to load game. Try again.");
    $("#play").prop("disabled", false);
    $("#reset").prop("disabled", true);
  }
}

/* Get category IDs with enough clues. 
//async function fetches a list of trivia categories from an API, filters them to ensure they have enough clues, randomly shuffles them, 
 and returns the IDs of a selected number of categories to use in the game. */
async function getCategoryIds() {
  const res = await fetch(`${API_URL}categories?count=100`); // Sends a request to the trivia API to get 100 categories and API_URL is a variable that holds the base URL of the API.
  const data = await res.json();
  const valid = data.filter((c) => c.clues_count >= NUM_CLUES); // Kepping 5 rows
  valid.sort(() => 0.5 - Math.random()); // shuffle
  return valid.slice(0, NUM_CATEGORIES).map((c) => c.id); // getting 6 random, valid category IDs.
}

// Get data for one category
async function getCategoryData(id) {
  const res = await fetch(`${API_URL}category?id=${id}`);
  const data = await res.json();

  const clues = data.clues
    .filter((c) => c.question && c.answer) // Filtering correct question and answer
    .slice(0, NUM_CLUES) // Takes only the first NUM_CLUES from the filtered list.
    .map((c, idx) => ({
      // Creates a new object for each clue with only the needed fields.
      id: c.id,
      question: c.question,
      answer: c.answer,
      value: c.value || (idx + 1) * 200,
    }));

  return { id: data.id, title: data.title, clues }; // Return result
}

// Building game board
function renderTable() {
  $("#categories").empty();
  $("#clues").empty();

  categories.forEach((cat) => {
    // Looping through each category in the global categories array. Creating <th> element (table header) with the category's title and appending to the #categories row.
    $("#categories").append($("<th>").text(cat.title));
  });

  for (let row = 0; row < NUM_CLUES; row++) {
    // Loops through rows from 0 to NUM_CLUES - 1 (typically 5 rows).
    const tr = $("<tr>");
    categories.forEach((cat) => {
      const clue = cat.clues[row];
      const td = $("<td>")
        .text(`$${clue.value}`) // adding dollar volue as text
        .attr("data-cat", cat.id) // ttribute with the category ID
        .attr("data-clue", clue.id) //attribute with the clue ID
        .on("click", handleClueClick);
      tr.append(td);
    });
    $("#clues").append(tr); // Appending the cell to the current row.
  }
}

// Handling clue click
function handleClueClick(e) {
  if (activeClueMode !== 0) return; // If queastion already readded, can not be read again.

  const cell = $(e.currentTarget); // is the exact element the user clicked.
  const catId = parseInt(cell.attr("data-cat")); // Reads custom data-cat and data-clue attributes that were added when the table was rendered.
  const clueId = parseInt(cell.attr("data-clue"));

  const category = categories.find((c) => c.id === catId); // Searches the global categories array to find the right category by catId,If no clue is found it will be broken reference and exit early.
  const clue = category && category.clues.find((c) => c.id === clueId);
  if (!clue) return;

  activeClue = { categoryId: catId, clueId, clue, cell }; // Storing information about the clicked clue in a global activeClue object.
  activeClueMode = 1; // Updatimng the mode to 1, indicating a clue is now active.

  $("#active-clue")
    .removeClass("flip-in")
    .text(clue.question)
    .addClass("flip-in");
}

// Handle clicking the question/answer box
function handleActiveClueClick() {
  if (!activeClue) return; // If there's no active clue, exit the function — nothing to do.

  if (activeClueMode === 1) {
    // If question is visible change mode to 2 and updating the #active-clue display to show the answer.
    activeClueMode = 2;
    $("#active-clue")
      .removeClass("flip-in")
      .text(activeClue.clue.answer)
      .addClass("flip-in");
  } else if (activeClueMode === 2) {
    // If answer is visible using .viewed class to the clue’s table cell and using disable clicking on that cell again (.off("click"))
    activeClue.cell.addClass("viewed").off("click");
    score += activeClue.clue.value;
    updateScore(); // Updating score
    removeClueFromData(activeClue.categoryId, activeClue.clueId);

    activeClue = null;
    activeClueMode = 0;
    $("#active-clue").text("Click on a clue to continue!");
    // When game finish write Game over, show total score and active Restart game
    if (categories.every((cat) => cat.clues.length === 0)) {
      $("#active-clue").text(`Game Over! Final Score: ${score}`);
      $("#play").prop("disabled", false).text("Restart Game");
      $("#reset").prop("disabled", true);
    }
  }
}

// Remove answered clue from data
function removeClueFromData(catId, clueId) {
  const category = categories.find((c) => c.id === catId);
  if (category) {
    category.clues = category.clues.filter((c) => c.id !== clueId);
  }
}

// Update score display
function updateScore() {
  $("#score").text(score);
}
