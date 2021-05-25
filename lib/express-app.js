import express from 'express'
import { hyperdriveHttpGateway } from './hyperdrive-http-gateway.js'

export function setupExpress ({ client, corestore }) {
  const app = express()

  app.use('/hyper', hyperdriveHttpGateway({
    client,
    corestore
  }))

  return app
}
