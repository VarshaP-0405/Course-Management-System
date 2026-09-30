import app from './app.js'
import { config } from './config/env.js'

app.listen(config.port, config.host, () => {
  console.log(`Course Management backend listening at http://${config.host}:${config.port}`)
})
