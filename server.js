const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'recipes.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize recipes.json if it doesn't exist
function readRecipes() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeRecipes(recipes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
}

// GET all recipes
app.get('/api/recipes', (req, res) => {
  res.json(readRecipes());
});

// POST a new recipe
app.post('/api/recipes', (req, res) => {
  const recipes = readRecipes();
  const recipe = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  recipes.push(recipe);
  writeRecipes(recipes);
  res.json(recipe);
});

// DELETE a recipe
app.delete('/api/recipes/:id', (req, res) => {
  let recipes = readRecipes();
  const before = recipes.length;
  recipes = recipes.filter(r => r.id !== req.params.id);
  if (recipes.length === before) {
    return res.status(404).json({ error: 'Recipe not found' });
  }
  writeRecipes(recipes);
  res.json({ ok: true });
});

// Seed default recipes if the file is empty
app.post('/api/seed', (req, res) => {
  const recipes = readRecipes();
  if (recipes.length > 0) {
    return res.json({ skipped: true, count: recipes.length });
  }
  const defaults = req.body;
  writeRecipes(defaults);
  res.json({ seeded: true, count: defaults.length });
});

app.listen(PORT, () => {
  console.log(`Dinner for 5 running on port ${PORT}`);
});
