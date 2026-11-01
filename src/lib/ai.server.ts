// Assistant IA spécialisé importation Chine -> Madagascar (serveur uniquement).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildKnowledgeContext } from "./kb.server";
import { linksContext, readLinksIn } from "./urlfetch.server";
import { IMPORT_MODEL_BLOCK } from "./import-model.server";

const MODEL = "google/gemini-3.6-flash";

export type PromptContext = {
  knowledge: string;
  matched: boolean;
  strong: boolean;
  links: string;
  level: string;
};

/** Règles de comportement de l'assistant. Indépendantes de l'interface. */
function systemPrompt(ctx: PromptContext) {
  const { knowledge, matched, strong, links, level } = ctx;
  return `Tu es "Mpanampy Importation", ny mpampiofana virtoaly an'ny GMAMIKO33 — sehatra malagasy fampianarana ny fanafarana entana avy any Chine mankaty Madagasikara.

## LANGUE (RÈGLE N°1)
- Ny MALAGASY no fiteny fototra. Valio amin'ny malagasy tsotra, mazava, mora azon'ny tanora Malagasy.
- Raha manoratra amin'ny frantsay ny mpianatra, valio amin'ny frantsay. Raha mifangaro (code-switching), araho izany.
- Mahay ny malagasy ofisialy (merina) sy ny tenin'ny tanora eto Antananarivo ianao : slang, verlan gasy, teny nindramina tamin'ny frantsay.
- Azonao tsara ny fanafohezana SMS : mba, azafady/afady, mtoa, tsy/ts, ok/oks, vola, ampy, tokony, dia/dy, aho/ah, ianao/anao/ano, izy/zy, misaotra/mrc, veloma/vlm, mety/mty, eny/ee, inona/ino/no, ahoana/ahn/mnao, manao ahoana/mnaoana, andao, mila, mahay, zao, efa, tsisy, mihitsy/mihts, be dia be, tsara/tsra, ratsy, ie, satria/sat, gasy, vazaha, mpanera. Raha misy fanafohezana tsy mazava, vinavinao ny heviny ary averino fohy ny fanontaniana azonao alohan'ny valiny.
- Teny teknika azo avela amin'ny frantsay/anglisy : Pinduoduo, 1688, Taobao, SHEIN, Alipay, VISA, transitaire, groupage, FCL, BSC, dédouanement, fret, m³, kg. Fa ny fanazavana manodidina dia amin'ny malagasy.

## SEHATRA VOAFETRA
- Ny fanafarana Chine -> Madagasikara ihany no resahinao (produit, plateforme sinoa, transitaire, fitaterana, fandoavam-bola, fivarotana eto Madagasikara).
- Raha mivoaka io sehatra io ny fanontaniana, lavo moramora amin'ny fehezanteny iray dia avereno amin'ny formation.
- Tsy IA generaliste ianao. Mpampiofana Malagasy manana traikefa ianao.
- Tsy manao calcul droits de douane MIHITSY ianao : ny transitaire no mikarakara ny fampidirana entana hatrany Madagasikara.

## RÈGLE ABSOLUE : NY BASE DE CONNAISSANCES NO LOHALAHARANA
- Ny fikarohana efa natao ho anao ao amin'ny rakitra rehetra (fahalalana, entana, transitaires, mpamatsy, dossiers, contenus) dia eo ambany.
- Raha misy vokatra ao amin'ny fizarana "RÉSULTATS DE RECHERCHE", TSY MAINTSY ampiasainao izy ireny. Tsy azonao atao ny milaza hoe "tsy fantatro" raha misy ny mombamomba azy eo.
- Raha misy fahalalana maromaro mifandraika, AMPIFANGARO izy rehetra. Aza mijanona amin'ny voalohany hita.
- Raha tsy mahita na inona na inona ao amin'ny base ianao, lazao mazava hoe avy amin'ny fahalalanao ankapobeny ny valiny.
${matched ? "- MISY VOKATRA HITA ho an'ity fanontaniana ity. Ampiasao izy ireo." : "- Tsy nisy vokatra mifanaraka mivantana hita tao amin'ny base ho an'ity fanontaniana ity."}

## FANANGONANA LOHARANO (transparence)
- Raha avy amin'ny base interne ny vaovao : "Araka ny fahalalana nampidirin'ny admin ao amin'ny application..." na "Araka ny traikefa voatahiry ao amin'ny base..."
- Raha vinavina : "Fanombanana izany fa mety hiova..." / "Tokony hamarinina amin'ny transitaire..."
- Ny tarif transitaire dia data voatahiry mety hiova : lazao ny daty nampidirana ary asao hanamarina.
- Fanavahana zava-dehibe : POIDS RÉEL ENREGISTRÉ (nomarihin'ny admin) vs POIDS ESTIMÉ (vinavinanao). Aza atao hoe efa voarefy ny vinavina.

## NIVEAU DE CONFIANCE (tsy maintsy asehoy)
- "Fahatokisana : AVO" — vaovao mazava hita ao amin'ny base active.
- "Fahatokisana : ANTONONY" — vaovao tsy feno na avy amin'ny loharano maromaro nampifangaroina.
- "Fahatokisana : AMBANY" — tsy voamarina na vinavina fotsiny.
${strong ? "Ho an'ity fanontaniana ity : misy fifanarahana mazava tao amin'ny base -> AVO azo atao." : ""}

## LIENS
${
  links
    ? `Nandramanao novakiana ireto lien ireto. Ampiasao ny votoatiny voalaza. Raha voalaza hoe TSY VOAVAKY ny lien, lazao mazava amin'ny mpianatra fa tsy tafiditra ianao ary ny antony — AZA MAMORONA votoaty MIHITSY.\n\n${links}`
    : "Raha manome lien ny mpianatra fa tsy misy votoaty voavaky eto, lazao fa tsy afaka namaky ianao. Aza mamorona."
}

## NIVEAU AN'NY MPIANATRA
${level}
Ampifanaraho amin'io niveau io ny fanazavanao : ho an'ny débutant -> tsotra be, dingana tsirairay ; ho an'ny avancé -> teknika kokoa.

## FOMBA FAMALIANA (mpampiofana, tsy chatbot)
1. Fantaro ny fanontaniana. 2. Ampiasao ny base. 3. Hazavao dingana tsirairay. 4. Marihina ny risque. 5. Omeo torohevitra azo ampiharina. 6. Soso-kevitra momba ny zavatra tokony hianarana manaraka.
- Fehezanteny fohy, lisitra, emoji kely azo atao. Vidiny amin'ny Ariary (Ar) sy dolara ($).
- Farano ny valiny lehibe amin'ireto : "Toro-hevitry ny mpampiofana", "Fahadisoana tokony hialana", "Dingana manaraka".
- Ho an'ny famakafakana produit na kajy sarany, araho tanteraka ny modely eo ambany (fitsipika fikajiana + rafitry ny tatitra).

${IMPORT_MODEL_BLOCK}

- Raha frantsay no valiny, adikao amin'ny frantsay ireo lohateny ireo.

## BASE DE CONNAISSANCES
${knowledge || "(tsy misy angona voatahiry — ampandreneso ny mpianatra fa ankapobeny sy mitandrina ny valinao)"}`;
}

/** Appel générique du modèle IA (utilisé aussi par l'analyse de produits). */
export async function runModel(system: string, prompt: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Tsy mandeha ny mpanampy : tsy hita ny clé IA.");
  const gateway = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = streamText({ model: gateway(MODEL), system, prompt });
    return await result.text;
  } catch (error) {
    throw new Error(gatewayError(error));
  }
}

function gatewayError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  if (message.includes("429")) return "Be loatra ny fangatahana. Andramo indray afaka kelikely.";
  if (message.includes("402")) return "Lany ny crédits IA. Mifandraisa amin'ny admin.";
  if (message.includes("401") || message.includes("403")) return "Tsy mahazo mampiasa ny IA (clé na policy). Mifandraisa amin'ny admin.";
  return `Tsy afaka namaly ny mpanampy : ${message}`;
}

/** Prompt système exporté pour les autres modules (analyse de produits). */
export const assistantSystemPrompt = (knowledge: string) =>
  systemPrompt({ knowledge, matched: Boolean(knowledge), strong: false, links: "", level: "Niveau tsy fantatra." });

/** Détermine le niveau pédagogique de l'étudiant à partir de ses quiz. */
export async function studentLevel(studentName: string) {
  const { data } = await supabaseAdmin
    .from("quiz_attempts")
    .select("score, total, created_at")
    .eq("student_name", studentName)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = data ?? [];
  if (!rows.length) return "Mpianatra vaovao : mbola tsy nanao quiz. Raiso ho DÉBUTANT.";
  const totals = rows.reduce((a, r) => a + (r.total || 0), 0);
  const scores = rows.reduce((a, r) => a + (r.score || 0), 0);
  const pct = totals ? Math.round((scores / totals) * 100) : 0;
  const label =
    pct >= 85 ? "Tena tsara" : pct >= 70 ? "Tsara" : pct >= 50 ? "Antonony" : pct >= 30 ? "Mandroso" : "Débutant";
  return `Niveau : ${label} (${pct}% tamin'ny quiz ${rows.length} farany). Azonao lazaina toy ny hoe "Araka ny valin'ny quiz-nao..." raha ilaina.`;
}

export async function listConversations(studentName: string) {
  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("student_name", studentName)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createConversation(studentName: string) {
  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .insert({ student_name: studentName })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Tsy afaka namorona resaka.");
  return data.id;
}

export async function deleteConversation(id: string, studentName: string) {
  const { error } = await supabaseAdmin
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("student_name", studentName);
  if (error) throw new Error(error.message);
}

export async function listAiMessages(conversationId: string, studentName: string) {
  const { data: conv } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, title, student_name")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || conv.student_name !== studentName) throw new Error("Tsy hita ilay resaka.");

  const { data, error } = await supabaseAdmin
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return { title: conv.title, messages: data ?? [] };
}

/** Pose une question à l'assistant et enregistre l'échange (1 crédit). */
export async function askAssistant(conversationId: string, studentName: string, question: string) {
  const { withCredit } = await import("./billing.server");
  return withCredit(studentName, () => askAssistantInner(conversationId, studentName, question), "assistant");
}

async function askAssistantInner(conversationId: string, studentName: string, question: string) {
  const text = question.trim().slice(0, 4000);
  if (!text) throw new Error("Tsy misy fanontaniana.");


  const [history, knowledge, pages, level] = await Promise.all([
    listAiMessages(conversationId, studentName),
    buildKnowledgeContext(text),
    readLinksIn(text),
    studentLevel(studentName),
  ]);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Tsy mandeha ny mpanampy : tsy hita ny clé IA.");

  const gateway = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  let answer: string;
  try {
    const result = streamText({
      model: gateway(MODEL),
      system: systemPrompt({
        knowledge: knowledge.text,
        matched: knowledge.matchCount > 0,
        strong: knowledge.strongCount > 0,
        links: linksContext(pages),
        level,
      }),
      messages: [
        ...history.messages.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ],
    });
    answer = await result.text;
  } catch (error) {
    throw new Error(gatewayError(error));
  }

  await supabaseAdmin.from("ai_messages").insert([
    { conversation_id: conversationId, role: "user", content: text },
    { conversation_id: conversationId, role: "assistant", content: answer },
  ]);

  const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
  if (history.messages.length === 0) patch.title = text.slice(0, 60);
  await supabaseAdmin.from("ai_conversations").update(patch).eq("id", conversationId);

  return answer;
}
