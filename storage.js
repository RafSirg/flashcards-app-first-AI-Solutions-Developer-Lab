const STORAGE_KEY = "flashcards-app-state";
const STORAGE_VERSION = 1;
const ALLOWED_TONES = new Set(["teal", "coral", "gold"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeState(value) {
  if (!isRecord(value) || !Array.isArray(value.decks)) return null;

  const decks = value.decks
    .filter((deck) => isRecord(deck) && typeof deck.id === "string" && deck.id && typeof deck.name === "string")
    .map((deck) => ({
      id: deck.id,
      name: deck.name.slice(0, 60),
      tone: ALLOWED_TONES.has(deck.tone) ? deck.tone : "teal",
      cards: Array.isArray(deck.cards)
        ? deck.cards
            .filter((card) => isRecord(card)
              && typeof card.id === "string"
              && card.id
              && typeof card.front === "string"
              && typeof card.back === "string")
            .map((card) => ({
              id: card.id,
              front: card.front.slice(0, 2000),
              back: card.back.slice(0, 2000),
            }))
        : [],
    }));

  const activeDeckExists = decks.some((deck) => deck.id === value.activeDeckId);
  return {
    decks,
    activeDeckId: activeDeckExists ? value.activeDeckId : (decks[0]?.id ?? null),
  };
}

function loadState() {
  try {
    const storedValue = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return null;

    const parsed = JSON.parse(storedValue);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;
    return normalizeState(parsed.state);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      state: normalizeState(state),
    }));
    return true;
  } catch {
    return false;
  }
}
