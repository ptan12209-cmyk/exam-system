const fs = require('fs');
const path = require('path');

// Try to find Supabase keys in env files
let supabaseUrl = '';
let supabaseKey = '';

const envPaths = ['.env', '.env.local', '.env.development', '.env.production'];
for (const envPath of envPaths) {
  const fullPath = path.join(__dirname, envPath);
  if (fs.existsSync(fullPath)) {
    console.log(`Found env file: ${envPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/);
    if (urlMatch) supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
    if (keyMatch) supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');
    break;
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Could not find Supabase URL or Anon Key in env files!");
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Query profiles table structure and contents
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error("Error querying profiles table:", error);
  } else {
    console.log("Profiles data sample (10 rows):");
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
