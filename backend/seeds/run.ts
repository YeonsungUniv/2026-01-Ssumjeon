import '../src/config/env'
import { seedTestUsers } from '../src/seeds/testUsers'
import { pool } from '../src/config/db'

seedTestUsers()
  .then(() => pool.end())
  .catch((err) => { console.error(err); process.exit(1) })
