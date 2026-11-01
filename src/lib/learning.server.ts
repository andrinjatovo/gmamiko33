// Modules d'évaluation (quiz), d'analyse de produits et de suivi des étudiants.
// Module serveur uniquement.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assistantSystemPrompt, runModel } from "./ai.server";
import { buildKnowledgeContext } from "./kb.server";
import { linksContext, readLinksIn } from "./urlfetch.server";
import { IMPORT_MODEL_BLOCK } from "./import-model.server";


/* -------------------------------- QUIZ -------------------------------- */

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  position: number;
};

export async function listQuizzes(onlyActive: boolean) {
  let q = supabaseAdmin
    .from("quizzes")
    .select("id, title, description, is_active, position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveQuiz(id: string | null, values: { title: string; description: string | null; is_active: boolean }) {
  if (id) {
    const { error } = await supabaseAdmin.from("quizzes").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabaseAdmin.from("quizzes").insert(values).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Création impossible.");
  return data.id;
}

export async function deleteQuiz(id: string) {
  const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listQuestions(quizId: string) {
  const { data, error } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QuizQuestion[];
}

export async function saveQuestion(
  id: string | null,
  values: { quiz_id: string; question: string; choices: string[]; correct_index: number; explanation: string | null; position: number },
) {
  const { error } = id
    ? await supabaseAdmin.from("quiz_questions").update(values).eq("id", id)
    : await supabaseAdmin.from("quiz_questions").insert(values);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id: string) {
  const { error } = await supabaseAdmin.from("quiz_questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Questions transmises à l'étudiant : sans la bonne réponse. */
export async function getQuizForStudent(quizId: string) {
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, description, is_active")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || !quiz.is_active) throw new Error("Quiz indisponible.");
  const questions = await listQuestions(quizId);
  return {
    title: quiz.title,
    description: quiz.description,
    questions: questions.map((q) => ({ id: q.id, question: q.question, choices: q.choices })),
  };
}

/** Corrige les réponses, enregistre la tentative et renvoie la correction. */
export async function submitQuiz(quizId: string, studentName: string, answers: Record<string, number>) {
  const questions = await listQuestions(quizId);
  if (questions.length === 0) throw new Error("Ce quiz ne contient aucune question.");

  const details = questions.map((q) => {
    const given = answers[q.id];
    return {
      id: q.id,
      question: q.question,
      choices: q.choices,
      correctIndex: q.correct_index,
      givenIndex: typeof given === "number" ? given : -1,
      correct: given === q.correct_index,
      explanation: q.explanation,
    };
  });
  const score = details.filter((d) => d.correct).length;

  await supabaseAdmin
    .from("quiz_attempts")
    .insert({ quiz_id: quizId, student_name: studentName, score, total: questions.length });

  return { score, total: questions.length, details };
}

export async function listMyAttempts(studentName: string) {
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id, quiz_id, score, total, created_at, quizzes(title)")
    .eq("student_name", studentName)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    id: a.id,
    quizId: a.quiz_id,
    title: (a.quizzes as { title: string } | null)?.title ?? "Quiz",
    score: a.score,
    total: a.total,
    created_at: a.created_at,
  }));
}

/* --------------------------- ANALYSE PRODUIT --------------------------- */

export type ProductInput = {
  productName: string;
  platform: string;
  purchasePrice: string;
  quantity: number | null;
  notes: string;
  productUrl?: string;
  weightKg?: number | null;
  transportMode?: string;
};

export async function analyzeProduct(studentName: string, input: ProductInput) {
  const { withCredit } = await import("./billing.server");
  return withCredit(studentName, () => analyzeProductInner(studentName, input), "analyse");
}

async function analyzeProductInner(studentName: string, input: ProductInput) {
  const name = input.productName.trim();
  if (!name) throw new Error("Ilaina ny anaran'ny produit.");

  const url = (input.productUrl ?? "").trim();
  const [knowledge, pages] = await Promise.all([
    buildKnowledgeContext(`${name} ${input.platform} ${input.notes}`),
    url ? readLinksIn(url) : Promise.resolve([]),
  ]);

  const linkBlock = linksContext(pages);

  const prompt = `Analyse ce produit pour une importation Chine -> Madagascar et produis le rapport complet en markdown selon le format imposé (en malgache).

Nom du produit : ${name}
Plateforme : ${input.platform || "non précisée"}
Lien du produit : ${url || "non fourni"}
Prix d'achat annoncé : ${input.purchasePrice || "non précisé"}
Quantité envisagée : ${input.quantity ?? "non précisée"}
Poids indiqué par l'étudiant : ${input.weightKg != null ? `${input.weightKg} kg` : "non précisé"}
Mode de transport souhaité : ${input.transportMode || "à conseiller"}
Précisions de l'étudiant : ${input.notes || "aucune"}

${linkBlock ? `CONTENU DES LIENS\n${linkBlock}\n` : ""}
${IMPORT_MODEL_BLOCK}

EXIGENCES SUPPLÉMENTAIRES
- Suis le gabarit ci-dessus section par section, sans en sauter aucune.
- Si aucun poids n'est fourni, estime-le à partir des produits de référence de la base et précise "LANJA VINAVINA".
- Compare au moins deux transitaires enregistrés (aérien Ar/kg vs maritime $/m³) et chiffre le coût pour la quantité envisagée.`;

  const report = await runModel(assistantSystemPrompt(knowledge.text), prompt);

  await supabaseAdmin.from("product_analyses").insert({
    student_name: studentName,
    product_name: name,
    platform: input.platform || null,
    purchase_price: input.purchasePrice || null,
    quantity: input.quantity,
    notes: [input.notes, url ? `Lien: ${url}` : "", input.weightKg != null ? `Poids: ${input.weightKg} kg` : "", input.transportMode ? `Transport: ${input.transportMode}` : ""]
      .filter(Boolean)
      .join(" | ") || null,
    report,
  });

  return report;
}


export async function listAnalyses(studentName: string) {
  const { data, error } = await supabaseAdmin
    .from("product_analyses")
    .select("id, product_name, platform, report, created_at")
    .eq("student_name", studentName)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteAnalysis(id: string, studentName: string) {
  const { error } = await supabaseAdmin
    .from("product_analyses")
    .delete()
    .eq("id", id)
    .eq("student_name", studentName);
  if (error) throw new Error(error.message);
}

/* ------------------------------- SUIVI -------------------------------- */

export async function studentTracking() {
  const [students, attempts, analyses, conversations, messages] = await Promise.all([
    supabaseAdmin.from("folder_students").select("student_name, created_at, folder_id").limit(2000),
    supabaseAdmin.from("quiz_attempts").select("student_name, score, total, created_at").limit(3000),
    supabaseAdmin.from("product_analyses").select("student_name, created_at").limit(3000),
    supabaseAdmin.from("ai_conversations").select("student_name, updated_at").limit(3000),
    supabaseAdmin.from("messages").select("author_name, is_admin, created_at").limit(3000),
  ]);

  type Row = {
    name: string;
    folders: number;
    attempts: number;
    avgScore: number | null;
    analyses: number;
    conversations: number;
    messages: number;
    lastActivity: string | null;
  };
  const map = new Map<string, Row & { scoreSum: number; scoreCount: number }>();
  const get = (name: string) => {
    const key = name.trim();
    if (!map.has(key))
      map.set(key, {
        name: key,
        folders: 0,
        attempts: 0,
        avgScore: null,
        analyses: 0,
        conversations: 0,
        messages: 0,
        lastActivity: null,
        scoreSum: 0,
        scoreCount: 0,
      });
    return map.get(key)!;
  };
  const touch = (row: { lastActivity: string | null }, date: string) => {
    if (!row.lastActivity || new Date(date) > new Date(row.lastActivity)) row.lastActivity = date;
  };

  for (const s of students.data ?? []) {
    const r = get(s.student_name);
    r.folders += 1;
    touch(r, s.created_at);
  }
  for (const a of attempts.data ?? []) {
    const r = get(a.student_name);
    r.attempts += 1;
    if (a.total > 0) {
      r.scoreSum += (a.score / a.total) * 100;
      r.scoreCount += 1;
    }
    touch(r, a.created_at);
  }
  for (const a of analyses.data ?? []) {
    const r = get(a.student_name);
    r.analyses += 1;
    touch(r, a.created_at);
  }
  for (const c of conversations.data ?? []) {
    const r = get(c.student_name);
    r.conversations += 1;
    touch(r, c.updated_at);
  }
  for (const m of messages.data ?? []) {
    if (m.is_admin) continue;
    const r = get(m.author_name);
    r.messages += 1;
    touch(r, m.created_at);
  }

  const rows = [...map.values()]
    .map(({ scoreSum, scoreCount, ...r }) => ({
      ...r,
      avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
    }))
    .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));

  return {
    rows,
    totals: {
      students: rows.length,
      attempts: (attempts.data ?? []).length,
      analyses: (analyses.data ?? []).length,
      conversations: (conversations.data ?? []).length,
    },
  };
}
