import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase
// Utiliza as variáveis de ambiente para configuração
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados no .env');
}

// Cria uma instância única do Supabase Client
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
