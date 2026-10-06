/** Buttons offered on "What makes a trip great for you?". People can also write in their own. */
export const INTEREST_OPTIONS = [
  "Art museums",
  "Galleries",
  "Street art",
  "Land art",
  "Architecture",
  "Ruins & castles",
  "History museums",
  "Archaeology",
  "Gem mining",
  "Science museums",
  "Aquariums & zoos",
  "Beaches",
  "Easy hikes",
  "Kayaking & canoeing",
  "Biking",
  "Parks & gardens",
  "Viewpoints",
  "Markets",
  "Shopping",
  "Food tours",
  "Wine tasting",
  "Bars & nightlife",
  "Live music",
  "Festivals",
  "Theater & shows",
  "Sports games",
  "Spas",
  "Playgrounds",
  "Boat trips",
  "Day trips",
] as const;

/** Buttons offered on "How do you like to eat?" — sorted into Love or Hate. People can write in their own. */
export const FOOD_OPTIONS = [
  "Seafood",
  "Shellfish",
  "Meat & grill",
  "Vegetarian",
  "Vegan",
  "Street food",
  "Food halls",
  "Bakeries & pastries",
  "Cafés",
  "Brunch",
  "Fine dining",
  "Tasting menus",
  "Local taverns",
  "Spicy food",
  "Wine bars",
  "Cocktail bars",
  "Craft beer",
  "Ice cream",
  "Pork",
  "Nuts",
  "Gluten",
  "Dairy",
] as const;

export const TRANSPORT_OPTIONS = [
  { value: "transit", label: "Public transportation" },
  { value: "car", label: "Car" },
] as const;

export const SCOPE_OPTIONS = [
  { value: "city", label: "Stay in the city" },
  { value: "leave", label: "Leave the city" },
  { value: "both", label: "Both" },
] as const;

export const PARTY_OPTIONS = [
  { value: "family", label: "Family" },
  { value: "couple", label: "Couple" },
  { value: "solo", label: "Solo" },
  { value: "friends", label: "Friends" },
] as const;

export const TIERS = [
  { value: "must", label: "Must do" },
  { value: "fit", label: "If I can fit it in" },
  { value: "pass", label: "If I pass by" },
] as const;
