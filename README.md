# MTG Epic Life Counter ⚔️

A professional, immersive, and highly responsive life counter for Magic: The Gathering, designed with an epic fantasy aesthetic inspired by the multiverse.

![MTG Life Counter Preview](https://picsum.photos/seed/fantasy-epic-fortress/800/400?blur=2)

## ✨ Features

- **Game Modes:** Supports both **Standard** (20 life) and **Commander** (40 life) formats.
- **Multiplayer Support:** Play with 2 to 8 players simultaneously.
- **Commander Damage Tracking:** Dedicated tracking for commander damage from each source, including visual danger indicators when approaching the 21-damage limit.
- **Epic Fantasy Theme:**
  - Dynamic background images for each player (castles, dragons, mages, etc.).
  - **Cinzel** typography for a majestic, medieval feel.
  - Dark, high-contrast UI optimized for long gaming sessions.
- **Interactive Animations:**
  - Smooth life total transitions using `framer-motion`.
  - Floating indicators for life increases (+5) and decreases (-3).
  - Subtle "pulse" effect on life changes for tactile feedback.
- **Game Utilities:**
  - Built-in match timer.
  - Quick reset and main menu navigation.
  - Responsive grid layout that adapts to the number of players.

## 🚀 Tech Stack

- **Framework:** [React 18](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Typography:** Google Fonts (Cinzel & Inter)

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mtg-life-counter.git
   cd mtg-life-counter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🎨 Customization

### Changing Background Images
You can easily swap the background images for each player card. Open `src/components/PlayerCard.tsx` and look for the following block:

```tsx
{/* Background Image - Change the URLs below to use specific MTG card art if desired */}
<img 
  src={`https://picsum.photos/seed/fantasy-epic-${[...]}/800/600?blur=1`}
  ...
/>
```
Replace the `src` with your preferred image URLs or a local asset path.

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

*Created with passion for the MTG community. May your top-decks be legendary!*
