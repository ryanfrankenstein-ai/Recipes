const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
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
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST a new recipe ──
app.post('/api/recipes', async (req, res) => {
  const { cat, name, time, ingredients, instructions } = req.body;

  // Place new recipe at the end of its category
  const { count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .eq('cat', cat);

  const { data, error } = await supabase
    .from('recipes')
    .insert([{ cat, name, time, ingredients, instructions, sort_order: (count || 0) * 1000 + 1000 }])
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

// ── PATCH recipe order — receives [{id, sort_order}, ...] ──
app.patch('/api/recipes/reorder', async (req, res) => {
  const updates = req.body; // [{ id, sort_order }, ...]
  const promises = updates.map(({ id, sort_order }) =>
    supabase.from('recipes').update({ sort_order }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const failed = results.find(r => r.error);
  if (failed) return res.status(500).json({ error: failed.error.message });
  res.json({ ok: true });
});

// ── Seed default recipes (only if table is empty) ──
app.post('/api/seed', async (req, res) => {
  const { count, error: countError } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true });

  if (countError) return res.status(500).json({ error: countError.message });
  if (count > 0) return res.json({ skipped: true, count });

  // Assign sort_order based on position in defaults list
  const defaults = req.body.map(({ id, createdAt, ...rest }, i) => ({
    ...rest,
    sort_order: (i + 1) * 1000
  }));

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
