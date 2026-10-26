# 🍔 The 69 Store — Food Stall Order Manager

A mobile-first order management and sales analytics application designed for **The 69 Store** food stall team: **Pramit**, **Sohana**, and **Sumedh**.

🌐 **Live Application:** [https://pramitghosh02.github.io/The-69-store/](https://pramitghosh02.github.io/The-69-store/)

---

## ✨ Features

- **Profile Login**: Sign in as Pramit, Sohana, or Sumedh with one tap.
- **Zomato-Style Sticky Cart**: Floating bottom bar shows item count and total; tap to expand the full drawer or place orders in 1 second.
- **Variant-Based Ordering**: Select sandwiches with or without cheese, coffee with or without ice cream, and fries with salted or peri peri flavour, each with independent pricing and quantities.
- **Sequential Order IDs**: Orders are numbered cleanly as `#1`, `#2`, `#3...` with a persistent sequence counter.
- **Status Workflow**: New orders default to `⏳ Pending`; tap once to switch to `✓ Completed`.
- **Order Editing & Permanent Deletion**: Edit any past order or delete mistakes permanently with immediate `-1` database count synchronization.
- **Analytics Dashboard**: Real-time sales metrics including Total Orders, Revenue, Items Sold, Unique Customers, Popular Items bar chart, and per-teammate performance breakdown with date filtering.
- **Data Export & Backup**: Export orders to CSV for spreadsheets or download/restore complete JSON backups.
- **Continuous Deployment**: Automated GitHub Actions workflow builds and publishes every push to GitHub Pages.

---

## 📋 Menu & Pricing

| Category | Item | Price |
|---|---|---|
| **Rolls** | Egg Roll | ₹49 |
| | Double Egg Roll | ₹59 |
| | Egg Chicken Roll | ₹69 |
| **Cutlets** | Veg Cutlets (3 pcs) | ₹49 |
| | Paneer Cutlets (3 pcs) | ₹59 |
| | Chicken Cutlets (3 pcs) | ₹69 |
| **Samosa** | Plain Samosa (1 pc) | ₹25 |
| | 1 Plate Samosa (2 pcs) | ₹48 |
| | Dahi Samosa Chat (2 pcs) | ₹50 |
| **Sandwiches** | Veg Sandwich | ₹39 *(Without Cheese)* / ₹49 *(With Cheese)* |
| | Paneer Sandwich | ₹59 *(Without Cheese)* / ₹69 *(With Cheese)* |
| | Chicken Sandwich | ₹59 *(Without Cheese)* / ₹69 *(With Cheese)* |
| **Kebabs** | Chicken Tikka Kebabs (3 pcs) | ₹69 |
| **Cold Coffee** | Classic Cold Coffee | ₹49 *(Optional Ice Cream Scoop)* |
| **Lassi** | Chatpate Lassi | ₹39 |
| | Rose Lassi | ₹39 |

---

## 🛠️ Development & Deployment

```sh
# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```

Every push to the `main` branch automatically deploys to GitHub Pages via `.github/workflows/deploy.yml`.
