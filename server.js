const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Load .env in development (ignored in production if env vars are set directly) ──
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase client ──
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.error('    Copy .env.example to .env and fill in your Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GET all recipes ──
app.get('/api/recipes', async (req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST a new recipe ──
app.post('/api/recipes', async (req, res) => {
  const { cat, name, time, ingredients, instructions } = req.body;

  const { data, error } = await supabase
    .from('recipes')
    .insert([{ cat, name, time, ingredients, instructions }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE a recipe ──
app.delete('/api/recipes/:id', async (req, res) => {
  const { error, count } = await supabase
    .from('recipes')
    .delete({ count: 'exact' })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ ok: true });
});

// ── Seed default recipes (only if table is empty) ──
app.post('/api/seed', async (req, res) => {
  // Check if any recipes already exist
  const { count, error: countError } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true });

  if (countError) return res.status(500).json({ error: countError.message });
  if (count > 0) return res.json({ skipped: true, count });

  // Strip any client-side ids — let Supabase generate them
  const defaults = req.body.map(({ id, createdAt, ...rest }) => rest);

  const { data, error } = await supabase
    .from('recipes')
    .insert(defaults)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ seeded: true, count: data.length });
});

app.listen(PORT, () => {
  console.log(`Dinner for 5 running on http://localhost:${PORT}`);
});
