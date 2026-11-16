const defaultDecks = [
  {
    id: "biology",
    name: "Biology",
    tone: "teal",
    cards: [{ id: "biology-1", front: "What is the powerhouse of the cell?", back: "Mitochondria" }],
  },
  {
    id: "history",
    name: "World history",
    tone: "coral",
    cards: [{ id: "history-1", front: "Which ancient civilization built Machu Picchu?", back: "The Inca civilization" }],
  },
  {
    id: "spanish",
    name: "Spanish",
    tone: "gold",
    cards: [{ id: "spanish-1", front: "How do you say ‘good morning’ in Spanish?", back: "Buenos días" }],
  },
];

const savedState = loadState();
let decks = savedState?.decks ?? defaultDecks;

const deckList = document.querySelector("#deck-list");
const activeDeckTitle = document.querySelector("#active-deck-title");
const cardPosition = document.querySelector("#card-position");
const studyCard = document.querySelector("#study-card");
const cardFront = document.querySelector("#card-front");
const cardBack = document.querySelector("#card-back");
const cardFrontText = document.querySelector("#card-front-text");
const cardBackText = document.querySelector("#card-back-text");
const revealButton = document.querySelector(".reveal-button");
const previousCardButton = document.querySelector("#previous-card-button");
const nextCardButton = document.querySelector("#next-card-button");
const cardActions = document.querySelector("#card-actions");
const newCardButton = document.querySelector("#new-card-button");
const editDeckButton = document.querySelector("#edit-deck-button");
const deleteDeckButton = document.querySelector("#delete-deck-button");
const deckSummary = document.querySelector("#deck-summary");
const deckEmptyState = document.querySelector("#deck-empty-state");
const studyModeButton = document.querySelector("#study-mode-button");
const studyModeLabel = document.querySelector("#study-mode-label");
const shuffleCardsButton = document.querySelector("#shuffle-cards-button");
const cardSearchInput = document.querySelector("#card-search");
const clearCardSearchButton = document.querySelector("#clear-card-search");
const searchMatchCount = document.querySelector("#search-match-count");
const cardEmptyState = document.querySelector("#card-empty-state");
const cardEmptyTitle = document.querySelector("#card-empty-title");
const cardEmptyDescription = document.querySelector("#card-empty-description");
const emptyStateCreateCardButton = document.querySelector("#empty-state-create-card");
const emptyStateClearSearchButton = document.querySelector("#empty-state-clear-search");
const deckDialog = document.querySelector("#deck-dialog");
const deckForm = document.querySelector("#deck-form");
const deckDialogTitle = document.querySelector("#deck-dialog-title");
const deckDialogEyebrow = document.querySelector("#deck-dialog-eyebrow");
const deckNameInput = document.querySelector("#deck-name");
const deckFormError = document.querySelector("#deck-form-error");
const saveDeckButton = document.querySelector("#save-deck-button");
const cardDialog = document.querySelector("#card-dialog");
const cardForm = document.querySelector("#card-form");
const cardDialogTitle = document.querySelector("#card-dialog-title");
const cardDialogEyebrow = document.querySelector("#card-dialog-eyebrow");
const cardFrontInput = document.querySelector("#card-front-input");
const cardBackInput = document.querySelector("#card-back-input");
const cardFormError = document.querySelector("#card-form-error");
const saveCardButton = document.querySelector("#save-card-button");
const newDeckButtons = [
  document.querySelector("#new-deck-button"),
  document.querySelector("#sidebar-new-deck-button"),
];

let activeDeckId = savedState?.activeDeckId ?? decks[0]?.id ?? null;
let activeCardIndex = 0;
let dialogMode = "create";
let cardDialogMode = "create";
let dialogOpener = null;
let activeDialog = null;
const deckIdCounter = { value: 1 };
const cardIdCounter = { value: 1 };
let showingAnswer = false;
let editingCardId = null;
let searchQuery = "";
let searchTimer = null;
let studyModeActive = false;
let studyOrder = [];

function createUniqueId(prefix, existingIds, counter) {
  let id;
  do {
    id = `${prefix}-${counter.value++}`;
  } while (existingIds.has(id));
  return id;
}

function getActiveDeck() {
  return decks.find((deck) => deck.id === activeDeckId) ?? null;
}

function getVisibleCards() {
  const deck = getActiveDeck();
  if (!deck) return [];
  if (!searchQuery) return deck.cards;

  const keyword = searchQuery.toLocaleLowerCase();
  return deck.cards.filter((card) => `${card.front} ${card.back}`.toLocaleLowerCase().includes(keyword));
}

function resetSearch() {
  clearTimeout(searchTimer);
  searchTimer = null;
  searchQuery = "";
  cardSearchInput.value = "";
}

function getCurrentCards() {
  const visibleCards = getVisibleCards();
  if (!studyModeActive) return visibleCards;

  const visibleById = new Map(visibleCards.map((card) => [card.id, card]));
  const orderedCards = studyOrder.map((id) => visibleById.get(id)).filter(Boolean);
  const orderedIds = new Set(orderedCards.map((card) => card.id));
  return [...orderedCards, ...visibleCards.filter((card) => !orderedIds.has(card.id))];
}

function getActiveCard() {
  return getCurrentCards()[activeCardIndex] ?? null;
}

function renderDeckList() {
  const items = decks.map((deck) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const dot = document.createElement("span");
    const name = document.createElement("span");
    const count = document.createElement("span");

    button.type = "button";
    button.className = "deck-link";
    button.dataset.deckId = deck.id;
    button.setAttribute("aria-pressed", String(deck.id === activeDeckId));
    if (deck.id === activeDeckId) button.classList.add("is-current");

    dot.className = `deck-dot deck-dot-${deck.tone}`;
    dot.setAttribute("aria-hidden", "true");
    name.textContent = deck.name;
    count.className = "deck-count";
    count.textContent = String(deck.cards.length);

    button.append(dot, name, count);
    item.append(button);
    return item;
  });

  deckList.replaceChildren(...items);
  deckEmptyState.hidden = decks.length > 0;
}

function updateCardPosition(cardCount, hasMatches) {
  if (cardCount === 0) {
    cardPosition.textContent = hasMatches ? "No cards yet" : "No matches";
    return;
  }

  const count = document.createElement("span");
  count.className = "muted";
  count.textContent = `of ${cardCount}`;
  cardPosition.replaceChildren(document.createTextNode(`Card ${activeCardIndex + 1} `), count);
}

function renderCardActions(deck, card) {
  if (!deck || !card) {
    cardActions.replaceChildren();
    return;
  }

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "text-button";
  editButton.dataset.cardAction = "edit";
  editButton.textContent = "Edit card";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "text-button danger-button";
  deleteButton.dataset.cardAction = "delete";
  deleteButton.textContent = "Delete card";

  cardActions.replaceChildren(editButton, deleteButton);
}

function renderActiveDeck() {
  showingAnswer = false;
  const deck = getActiveDeck();
  const allCards = deck?.cards ?? [];
  const cards = getCurrentCards();
  activeCardIndex = cards.length ? Math.min(activeCardIndex, cards.length - 1) : 0;
  const card = cards[activeCardIndex] ?? null;

  activeDeckTitle.textContent = deck?.name ?? "No decks yet";
  editDeckButton.disabled = !deck;
  deleteDeckButton.disabled = !deck;
  newCardButton.disabled = !deck;
  studyModeButton.disabled = !allCards.length;
  studyModeButton.textContent = studyModeActive ? "Exit study" : "Study";
  studyModeButton.setAttribute("aria-pressed", String(studyModeActive));
  studyModeLabel.textContent = studyModeActive ? "STUDY MODE" : "DECK PREVIEW";

  const matchLabel = cards.length === 1 ? "match" : "matches";
  searchMatchCount.textContent = searchQuery
    ? `${cards.length} ${matchLabel}`
    : `${allCards.length} ${allCards.length === 1 ? "card" : "cards"}`;
  cardSearchInput.disabled = !deck;
  clearCardSearchButton.hidden = !searchQuery;

  studyCard.hidden = !card;
  cardEmptyState.hidden = Boolean(card);
  cardEmptyTitle.textContent = !deck
    ? "No decks yet"
    : allCards.length === 0
      ? "No cards yet"
      : "No cards found";
  cardEmptyDescription.textContent = !deck
    ? "Create a deck to organize your flashcards."
    : allCards.length === 0
      ? "Create a card with a front and back to begin studying."
      : "Try another keyword or clear your search to see all cards.";
  emptyStateCreateCardButton.hidden = !deck;
  emptyStateClearSearchButton.hidden = !searchQuery;

  cardFront.querySelector(".card-label").textContent = card ? "FRONT" : "EMPTY DECK";
  cardFrontText.textContent = card?.front ?? "";
  cardBackText.textContent = card?.back ?? "";
  cardFront.setAttribute("aria-hidden", String(showingAnswer));
  cardBack.setAttribute("aria-hidden", String(!showingAnswer || !card));
  studyCard.classList.toggle("is-flipped", showingAnswer && Boolean(card));
  revealButton.hidden = !card;
  revealButton.textContent = "Flip";
  revealButton.setAttribute("aria-pressed", "false");
  updateCardPosition(cards.length, allCards.length > 0);
  previousCardButton.disabled = cards.length < 2;
  nextCardButton.disabled = cards.length < 2;
  shuffleCardsButton.disabled = cards.length < 2;
  renderCardActions(deck, card);
}

function renderSummary() {
  const cardCount = decks.reduce((total, deck) => total + deck.cards.length, 0);
  const deckLabel = decks.length === 1 ? "deck" : "decks";
  const cardLabelText = cardCount === 1 ? "card" : "cards";
  deckSummary.textContent = `${decks.length} ${deckLabel} · ${cardCount} ${cardLabelText}`;
}

function renderApp() {
  renderDeckList();
  renderActiveDeck();
  renderSummary();
  saveState({ decks, activeDeckId });
}

function stopStudyMode() {
  document.removeEventListener("keydown", handleStudyKeyboard);
  studyModeActive = false;
  studyOrder = [];
}

function enterStudyMode(deckId) {
  const deck = decks.find((item) => item.id === deckId);
  if (!deck || deck.cards.length === 0) return false;

  document.removeEventListener("keydown", handleStudyKeyboard);
  activeDeckId = deck.id;
  activeCardIndex = 0;
  studyOrder = deck.cards.map((card) => card.id);
  studyModeActive = true;
  document.addEventListener("keydown", handleStudyKeyboard);
  renderApp();
  studyCard.focus();
  return true;
}

function exitStudyMode() {
  if (!studyModeActive) return;
  stopStudyMode();
  renderActiveDeck();
  studyModeButton.focus();
}

function flipStudyCard() {
  if (!getActiveCard()) return;

  showingAnswer = !showingAnswer;
  studyCard.classList.toggle("is-flipped", showingAnswer);
  cardFront.setAttribute("aria-hidden", String(showingAnswer));
  cardBack.setAttribute("aria-hidden", String(!showingAnswer));
  revealButton.setAttribute("aria-pressed", String(showingAnswer));
}

function handleStudyKeyboard(event) {
  if (!studyModeActive || activeDialog || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLElement
    && event.target.matches("input, textarea, select, button, a, [contenteditable='true']")) return;

  if (event.code === "Space") {
    event.preventDefault();
    flipStudyCard();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveCard(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveCard(1);
  }
}

function shuffleCards() {
  const cards = getVisibleCards();
  if (cards.length < 2) return;
  if (!studyModeActive) enterStudyMode(activeDeckId);

  studyOrder = cards.map((card) => card.id);
  for (let index = studyOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [studyOrder[index], studyOrder[swapIndex]] = [studyOrder[swapIndex], studyOrder[index]];
  }

  activeCardIndex = 0;
  renderActiveDeck();
  studyCard.focus();
}

function openModal(dialog, opener, initialFocus) {
  activeDialog = dialog;
  dialogOpener = opener;
  dialog.showModal();
  initialFocus.focus();
}

function closeModal(dialog, returnFocusTarget = dialogOpener) {
  if (!dialog.open) return;

  dialog.close();
  activeDialog = null;
  dialogOpener = null;
  requestAnimationFrame(() => {
    if (returnFocusTarget?.isConnected && !returnFocusTarget.disabled) {
      returnFocusTarget.focus();
    } else {
      newDeckButtons[0].focus();
    }
  });
}

function openDeckDialog(mode, opener) {
  const deck = getActiveDeck();
  if (mode === "edit" && !deck) return;

  dialogMode = mode;
  dialogOpener = opener;
  deckForm.reset();
  deckFormError.hidden = true;
  deckFormError.textContent = "";
  deckNameInput.setAttribute("aria-invalid", "false");
  deckDialogTitle.textContent = mode === "create" ? "Create a deck" : "Edit deck name";
  deckDialogEyebrow.textContent = mode === "create" ? "NEW DECK" : "EDIT DECK";
  saveDeckButton.textContent = mode === "create" ? "Create deck" : "Save changes";
  deckNameInput.value = mode === "edit" ? deck.name : "";
  openModal(deckDialog, opener, deckNameInput);
}

function openCardDialog(mode, opener) {
  const deck = getActiveDeck();
  const card = getActiveCard();
  if (!deck || (mode === "edit" && !card)) return;

  cardDialogMode = mode;
  editingCardId = mode === "edit" ? card.id : null;
  cardForm.reset();
  cardFormError.hidden = true;
  cardFormError.textContent = "";
  cardFrontInput.setAttribute("aria-invalid", "false");
  cardBackInput.setAttribute("aria-invalid", "false");
  cardDialogTitle.textContent = mode === "create" ? "Create a card" : "Edit card";
  cardDialogEyebrow.textContent = mode === "create" ? "NEW CARD" : "EDIT CARD";
  saveCardButton.textContent = mode === "create" ? "Create card" : "Save changes";
  cardFrontInput.value = mode === "edit" ? card.front : "";
  cardBackInput.value = mode === "edit" ? card.back : "";
  openModal(cardDialog, opener, cardFrontInput);
}

function handleDialogKeydown(event) {
  const dialog = event.currentTarget;
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal(dialog);
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = [...dialog.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && element.getClientRects().length > 0);

  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const focusIsOutside = !dialog.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
    event.preventDefault();
    first.focus();
  }
}

newDeckButtons.forEach((button) => {
  button.addEventListener("click", (event) => openDeckDialog("create", event.currentTarget));
});

deckList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-deck-id]");
  if (!button) return;

  const selectedDeck = decks.find((deck) => deck.id === button.dataset.deckId);
  resetSearch();
  if (studyModeActive && selectedDeck?.cards.length) {
    enterStudyMode(selectedDeck.id);
    return;
  }

  stopStudyMode();
  activeDeckId = button.dataset.deckId;
  activeCardIndex = 0;
  renderApp();
  [...deckList.querySelectorAll("button[data-deck-id]")]
    .find((deckButton) => deckButton.dataset.deckId === activeDeckId)
    ?.focus();
});

editDeckButton.addEventListener("click", (event) => openDeckDialog("edit", event.currentTarget));

deleteDeckButton.addEventListener("click", () => {
  const deck = getActiveDeck();
  if (!deck || !window.confirm(`Delete “${deck.name}”? This cannot be undone.`)) return;

  stopStudyMode();
  resetSearch();
  const removedIndex = decks.findIndex((item) => item.id === deck.id);
  decks.splice(removedIndex, 1);
  activeDeckId = decks[Math.min(removedIndex, decks.length - 1)]?.id ?? null;
  activeCardIndex = 0;
  renderApp();

  const nextActiveButton = [...deckList.querySelectorAll("button[data-deck-id]")]
    .find((button) => button.dataset.deckId === activeDeckId);
  (nextActiveButton ?? newDeckButtons[0]).focus();
});

deckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = deckNameInput.value.trim();

  if (!name) {
    deckFormError.textContent = "Enter a deck name.";
    deckFormError.hidden = false;
    deckNameInput.setAttribute("aria-invalid", "true");
    deckNameInput.focus();
    return;
  }
  deckNameInput.setAttribute("aria-invalid", "false");

  if (dialogMode === "create") {
    stopStudyMode();
    resetSearch();
    const deck = {
      id: createUniqueId("deck", new Set(decks.map((item) => item.id)), deckIdCounter),
      name,
      tone: ["teal", "coral", "gold"][decks.length % 3],
      cards: [],
    };
    decks.push(deck);
    activeDeckId = deck.id;
    activeCardIndex = 0;
  } else {
    const deck = getActiveDeck();
    if (deck) deck.name = name;
  }

  renderApp();
  closeModal(deckDialog);
});

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const front = cardFrontInput.value.trim();
  const back = cardBackInput.value.trim();

  if (!front || !back) {
    cardFormError.textContent = "Enter text for both sides of the card.";
    cardFormError.hidden = false;
    cardFrontInput.setAttribute("aria-invalid", String(!front));
    cardBackInput.setAttribute("aria-invalid", String(!back));
    (!front ? cardFrontInput : cardBackInput).focus();
    return;
  }
  cardFrontInput.setAttribute("aria-invalid", "false");
  cardBackInput.setAttribute("aria-invalid", "false");

  const deck = getActiveDeck();
  if (!deck) return;

  let returnFocusTarget = dialogOpener;
  if (cardDialogMode === "create") {
    const card = {
      id: createUniqueId("card", new Set(deck.cards.map((item) => item.id)), cardIdCounter),
      front,
      back,
    };
    deck.cards.push(card);
    resetSearch();
    if (studyModeActive) studyOrder = deck.cards.map((item) => item.id);
    activeCardIndex = deck.cards.length - 1;
  } else {
    const cardIndex = deck.cards.findIndex((card) => card.id === editingCardId);
    if (cardIndex < 0) return;
    deck.cards[cardIndex] = { ...deck.cards[cardIndex], front, back };
    activeCardIndex = cardIndex;
  }

  renderApp();
  if (cardDialogMode === "edit") {
    returnFocusTarget = cardActions.querySelector('[data-card-action="edit"]') ?? newCardButton;
  }
  closeModal(cardDialog, returnFocusTarget);
});

cardActions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-card-action]");
  if (!button) return;

  if (button.dataset.cardAction === "edit") {
    openCardDialog("edit", button);
    return;
  }

  const deck = getActiveDeck();
  const card = getActiveCard();
  if (button.dataset.cardAction !== "delete" || !deck || !card) return;
  if (!window.confirm("Delete this card? This cannot be undone.")) return;

  const removedPosition = activeCardIndex;
  const removedIndex = deck.cards.findIndex((item) => item.id === card.id);
  deck.cards.splice(removedIndex, 1);
  studyOrder = studyOrder.filter((id) => id !== card.id);
  if (studyModeActive && deck.cards.length === 0) stopStudyMode();
  activeCardIndex = Math.min(removedPosition, Math.max(0, getCurrentCards().length - 1));
  renderApp();
  (cardActions.querySelector('[data-card-action="edit"]') ?? newCardButton).focus();
});

newCardButton.addEventListener("click", (event) => openCardDialog("create", event.currentTarget));

function moveCard(direction) {
  const cardCount = getCurrentCards().length;
  if (cardCount < 2) return;
  activeCardIndex = (activeCardIndex + direction + cardCount) % cardCount;
  renderActiveDeck();
}

function applyCardSearch() {
  searchQuery = cardSearchInput.value.trim();
  activeCardIndex = 0;
  renderActiveDeck();
}

function clearCardSearch() {
  resetSearch();
  activeCardIndex = 0;
  renderActiveDeck();
  cardSearchInput.focus();
}

cardSearchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyCardSearch, 300);
});

clearCardSearchButton.addEventListener("click", clearCardSearch);
emptyStateClearSearchButton.addEventListener("click", clearCardSearch);
emptyStateCreateCardButton.addEventListener("click", (event) => openCardDialog("create", event.currentTarget));
studyModeButton.addEventListener("click", () => {
  if (studyModeActive) exitStudyMode();
  else enterStudyMode(activeDeckId);
});
shuffleCardsButton.addEventListener("click", shuffleCards);
previousCardButton.addEventListener("click", () => moveCard(-1));
nextCardButton.addEventListener("click", () => moveCard(1));

document.querySelector("#close-deck-dialog").addEventListener("click", () => closeModal(deckDialog));
document.querySelector("#cancel-deck-dialog").addEventListener("click", () => closeModal(deckDialog));
document.querySelector("#close-card-dialog").addEventListener("click", () => closeModal(cardDialog));
document.querySelector("#cancel-card-dialog").addEventListener("click", () => closeModal(cardDialog));

deckDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal(deckDialog);
});
cardDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal(cardDialog);
});
deckDialog.addEventListener("keydown", handleDialogKeydown);
cardDialog.addEventListener("keydown", handleDialogKeydown);

revealButton.addEventListener("click", flipStudyCard);

renderApp();
