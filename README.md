# Components Setup — Figma Plugin ⚡

A productivity-focused Figma plugin designed to accelerate component architecture, automate canvas layout organization, and manage variable bindings with ease.

---

## ✨ Features

### 🧩 1. Intelligent Component Set Setup
* **One-Click Component Set Creation:** Converts standalone components directly into variant component sets with `type=default` variant structure.
* **Auto-Container Renaming & Base Metrics:** Automatically detects default `Frame X` layers and renames them to `container`, applying clean baseline metrics:
  * **Auto Layout:** `itemSpacing`, `counterAxisSpacing`, and all paddings set to `constant/none` (`0`).
  * **Corner Radius:** All corner radii bound to `constant/none` (`0`) with `0.6` corner smoothing.
* **Smart Section & Screen Styling:** Automatically binds appropriate radius, background, and stroke tokens for `section`, `main`, `component`, and `screen` layers.

### 📐 2. Canvas Grid Auto-Arranger & Slash Grouping
* **Alphabetical Grid Organization:** Automatically organizes canvas elements alphabetically with consistent `272px` horizontal and `272px` vertical spacing.
* **Slash-Group Column Stacking:** Groups elements sharing a common prefix before the slash (e.g. `button/default`, `button/secondary`, `button/ghost`) and stacks them vertically into columns.
* **Clean Canvas & Collapsed Layers:** Automatically clears selection and collapses all container layers in Figma's Layers panel (`Alt + L`) after arranging.

### 🔍 3. Numeric Variable Inspector & Token Audit
* **Audit Selection / Page for Unbound & Missing Tokens:** Deep-scans active selection (or current page) for `gap` (`itemSpacing`, `counterAxisSpacing`), `paddings` (top, bottom, left, right), and `corner radius` (uniform and individual corners).
* **Detect Unbound & Missing Variables:** Instantly flags hardcoded numeric values lacking variable bindings and identifies broken or missing variable aliases.
* **Interactive Navigation & Auto-Select:** Click any issue card to select and zoom into the offending layer on canvas, or select all layers with issues simultaneously.
* **Token Matching Suggestions:** Highlights matching design system tokens (e.g. `base`, `medium`, `large`) for arbitrary values.

### ✏️ 4. Retextifier — Multi-Input Text Replacement
* **Deep Detection:** Recursively scans current selection to identify all nested text layers (e.g. inside cards, frames, components, or groups).
* **Dynamic UI:** Automatically generates exactly as many input fields as text layers detected, displaying current text and layer hierarchy.
* **Multi-Paste (Ctrl+V):** Intercepts clipboard content and splits multiple text strings sequentially across generated inputs.
* **Missing Match Protection:** Extra inputs remain empty and are ignored, leaving canvas layers untouched when fewer strings are pasted.
* **Font-Safe Canvas Apply:** Loads fonts (including mixed font ranges) and updates canvas text layers upon clicking Apply.

---

## 🛠️ Development & Building

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build TypeScript:**
   ```bash
   npm run build
   ```
3. **Watch mode during development:**
   ```bash
   npm run watch
   ```

---

## 🚀 Installation in Figma

1. Open **Figma Desktop App**.
2. Go to **Plugins** -> **Development** -> **Import plugin from manifest...**.
3. Select the `manifest.json` file from this repository.
4. Run via **Plugins** -> **Development** -> **Components Setup**.

---

## 📁 Project Structure

```text
components-setup/
├── manifest.json     # Figma plugin manifest
├── code.ts           # Main plugin backend TypeScript source
├── code.js           # Compiled JavaScript plugin bundle
├── ui.html           # Plugin UI interface & styling
├── tsconfig.json     # TypeScript compiler configuration
├── package.json      # NPM scripts & dependencies
├── .gitignore        # Git ignore rules
└── README.md         # Project documentation
```

---

## 📄 License

Created with ❤️ by **Me & My Friends S.A.**
