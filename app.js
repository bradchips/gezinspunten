const SUPABASE_URL = "https://psskyozvzmgfppbpkxkl.supabase.co";
const SUPABASE_KEY = "sb_publishable_RB-K8vKRIk80fzUnO6bjaQ_bak6QV-e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase gekoppeld");
const FAMILY_ID = "535e95f7-ef01-4cab-80e0-504aa2984";

async function testDatabase() {
  const { data, error } = await db
    .from("children")
    .select("*")
    .eq("family_id", FAMILY_ID);

  if (error) {
    console.error("Supabase fout:", error);
    alert("Databaseverbinding mislukt: " + error.message);
    return;
  }

  console.log("Kinderen uit Supabase:", data);
}

testDatabase();
