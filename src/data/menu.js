export const MENU = [
  // ===== ROLLS =====
  {
    id: 'egg-roll',
    name: 'Egg Roll',
    emoji: '🌯',
    group: 'Rolls',
    category: 'nonveg',
    price: 49,
    desc: null,
    options: null,
  },
  {
    id: 'double-egg-roll',
    name: 'Double Egg Roll',
    emoji: '🌯',
    group: 'Rolls',
    category: 'nonveg',
    price: 59,
    desc: null,
    options: null,
  },
  {
    id: 'egg-chicken-roll',
    name: 'Egg Chicken Roll',
    emoji: '🌯',
    group: 'Rolls',
    category: 'nonveg',
    price: 69,
    desc: null,
    options: null,
  },

  // ===== CUTLETS =====
  {
    id: 'veg-cutlets',
    name: 'Veg Cutlets',
    emoji: '🥘',
    group: 'Cutlets',
    category: 'veg',
    price: 49,
    desc: '3 pcs',
    options: null,
  },
  {
    id: 'paneer-cutlets',
    name: 'Paneer Cutlets',
    emoji: '🧀',
    group: 'Cutlets',
    category: 'veg',
    price: 59,
    desc: '3 pcs',
    options: null,
  },
  {
    id: 'chicken-cutlets',
    name: 'Chicken Cutlets',
    emoji: '🍗',
    group: 'Cutlets',
    category: 'nonveg',
    price: 69,
    desc: '3 pcs',
    options: null,
  },

  // ===== SAMOSA =====
  {
    id: 'plain-samosa',
    name: 'Plain Samosa',
    emoji: '🔺',
    group: 'Samosa',
    category: 'veg',
    price: 25,
    desc: '1 pc',
    options: null,
  },
  {
    id: 'plate-samosa',
    name: '1 Plate Samosa',
    emoji: '🔺',
    group: 'Samosa',
    category: 'veg',
    price: 48,
    desc: '2 pcs',
    options: null,
  },
  {
    id: 'dahi-samosa-chat',
    name: 'Dahi Samosa Chat',
    emoji: '🍲',
    group: 'Samosa',
    category: 'veg',
    price: 50,
    desc: '2 pcs',
    options: null,
  },

  // ===== SANDWICHES =====
  {
    id: 'veg-sandwich',
    name: 'Veg Sandwich',
    emoji: '🥪',
    group: 'Sandwiches',
    category: 'veg',
    price: null,
    desc: null,
    options: {
      label: 'Cheese',
      choices: [
        { name: 'Without Cheese', price: 39 },
        { name: 'With Cheese', price: 49 },
      ],
    },
  },
  {
    id: 'paneer-sandwich',
    name: 'Paneer Sandwich',
    emoji: '🧀',
    group: 'Sandwiches',
    category: 'veg',
    price: null,
    desc: null,
    options: {
      label: 'Cheese',
      choices: [
        { name: 'Without Cheese', price: 59 },
        { name: 'With Cheese', price: 69 },
      ],
    },
  },
  {
    id: 'chicken-sandwich',
    name: 'Chicken Sandwich',
    emoji: '🍗',
    group: 'Sandwiches',
    category: 'nonveg',
    price: null,
    desc: null,
    options: {
      label: 'Cheese',
      choices: [
        { name: 'Without Cheese', price: 59 },
        { name: 'With Cheese', price: 69 },
      ],
    },
  },

  // ===== KEBABS =====
  {
    id: 'chicken-tikka-kebabs',
    name: 'Chicken Tikka Kebabs',
    emoji: '🍢',
    group: 'Kebabs',
    category: 'nonveg',
    price: 69,
    desc: '3 pcs',
    options: null,
  },

  // ===== COLD COFFEE =====
  {
    id: 'classic-cold-coffee',
    name: 'Classic Cold Coffee',
    emoji: '☕',
    group: 'Cold Coffee',
    category: 'veg',
    price: null,
    desc: null,
    options: {
      label: 'Add-on',
      choices: [
        { name: 'Plain', price: 49 },
        { name: 'With Ice Cream Scoop', price: 49 },
      ],
    },
  },

  // ===== LASSI =====
  {
    id: 'chatpate-lassi',
    name: 'Chatpate Lassi',
    emoji: '🥛',
    group: 'Lassi',
    category: 'veg',
    price: 39,
    desc: null,
    options: null,
  },
  {
    id: 'rose-lassi',
    name: 'Rose Lassi',
    emoji: '🌹',
    group: 'Lassi',
    category: 'veg',
    price: 39,
    desc: null,
    options: null,
  },
];

export const TEAM_MEMBERS = ['Pramit', 'Sohana', 'Sumedh'];

/** Helper: get ordered unique groups from the menu */
export function getMenuGroups() {
  const seen = new Set();
  const groups = [];
  MENU.forEach((item) => {
    if (!seen.has(item.group)) {
      seen.add(item.group);
      groups.push(item.group);
    }
  });
  return groups;
}
