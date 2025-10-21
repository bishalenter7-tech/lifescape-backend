import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

/* ---------- ROUTES ---------- */

// test route
app.get("/", (req, res) => {
  res.send("Lifescape Backend Working 🚀");
});

// get all tasks
app.get("/tasks/:userId", async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);
  if (error) return res.status(400).json({ error });
  res.json(data);
});

// add new task
app.post("/tasks", async (req, res) => {
  const { user_id, title, description, xp_reward } = req.body;
  const { data, error } = await supabase
    .from("tasks")
    .insert([{ user_id, title, description, xp_reward }])
    .select()
    .single();
  if (error) return res.status(400).json({ error });
  res.json(data);
});

// complete task
app.post("/tasks/complete", async (req, res) => {
  const { taskId } = req.body;

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.completed) return res.status(400).json({ error: "Already completed" });

  await supabase.from("tasks").update({ completed: true }).eq("id", taskId);

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", task.user_id)
    .single();

  const newXP = (user.xp || 0) + (task.xp_reward || 10);
  const newLevel = calculateLevel(newXP);

  const { data: updatedUser } = await supabase
    .from("users")
    .update({ xp: newXP, level: newLevel })
    .eq("id", user.id)
    .select()
    .single();

  res.json({ message: "Task completed", user: updatedUser });
});

// add XP manually
app.post("/user/add-xp", async (req, res) => {
  const { userId, xpAmount } = req.body;
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  const newXP = (user.xp || 0) + xpAmount;
  const newLevel = calculateLevel(newXP);

  const { data: updatedUser } = await supabase
    .from("users")
    .update({ xp: newXP, level: newLevel })
    .eq("id", userId)
    .select()
    .single();

  res.json(updatedUser);
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Lifescape backend running on http://localhost:${PORT}`)
);
