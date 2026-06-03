import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  const { data, error } = await supabase.from('schools').select('count', { count: 'exact', head: true })
  if (error) {
    console.error('Connection error:', error.message)
  } else {
    console.log('Successfully connected to Supabase!')
  }
}

testConnection()
