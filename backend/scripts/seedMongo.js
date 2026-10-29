import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../src/services/mongoDatabaseService.js'
import { config } from '../src/config/env.js'
import { Counter, collectionNames, models } from '../src/models/index.js'

async function seedMongo() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI must be set in backend/.env before importing seed data.')
  }
  const database = JSON.parse(await readFile(config.dataFile, 'utf8'))
  database.users = await Promise.all(database.users.map(async (user) => {
    if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password)) return user
    return { ...user, password: await bcrypt.hash(user.password, 12) }
  }))
  await connectDatabase(config.mongoUri)

  for (const collection of collectionNames) {
    const records = database[collection]
    if (!Array.isArray(records)) throw new Error(`Seed data is missing collection "${collection}".`)
    const model = models[collection]
    await model.init()
    if (records.length) {
      await model.bulkWrite(records.map((record) => ({
        updateOne: {
          filter: { id: record.id },
          update: { $setOnInsert: record },
          upsert: true,
        },
      })), { ordered: true })
    }
    const maximum = records.reduce((value, record) => Math.max(value, Number(record.id) || 0), 0)
    await Counter.updateOne({ _id: collection }, { $max: { value: maximum } }, { upsert: true })
  }
  console.log('MongoDB seed data imported. Existing records with matching IDs were left unchanged.')
}

try {
  await seedMongo()
} catch (error) {
  console.error('MongoDB seed failed:', error.message)
  process.exitCode = 1
} finally {
  await disconnectDatabase()
}
