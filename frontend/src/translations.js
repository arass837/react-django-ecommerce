
// Translate demo records already stored in a Polish-language database.
export const EN_NAMES = {
  "Elektronika": "Electronics",
  "Akcesoria": "Accessories",
  "Słuchawki bezprzewodowe": "Wireless Headphones",
  "Klawiatura mechaniczna": "Mechanical Keyboard",
  "Mysz ergonomiczna": "Ergonomic Mouse",
  "Plecak miejski": "Urban Backpack",
  "Bidon termiczny": "Insulated Water Bottle",
  "Lampka biurkowa": "Desk Lamp",
  "Słuchawki Bluetooth do codziennego użytku.": "Bluetooth headphones for everyday use.",
  "Klawiatura do pracy i grania.": "Keyboard for work and gaming.",
  "Wygodna mysz do komputera.": "Comfortable computer mouse.",
  "Plecak do szkoły i pracy.": "Backpack for school and work.",
  "Stalowy bidon termiczny.": "Stainless steel insulated water bottle.",
  "Nowoczesna lampka LED.": "Modern LED desk lamp.",
};

export const enText = (value) => EN_NAMES[value] ?? value;
