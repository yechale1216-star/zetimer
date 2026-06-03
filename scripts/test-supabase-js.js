const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('Testing connection to Supabase Auth/API...')
  const { data, error } = await supabase.from('students').select('*').limit(1)
  if (error) {
    console.error('Connection error:', error.message)
    if (error.details) console.log('Details:', error.details)
    if (error.hint) console.log('Hint:', error.hint)
  } else {
    console.log('Successfully connected to Supabase and fetched data!')
    console.log('Data:', data)
  }
}

testConnection()
