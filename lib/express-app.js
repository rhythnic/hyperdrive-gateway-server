import express from 'express'
import { hyperdriveHttpGateway } from './hyperdrive-http-gateway.js'
import expressHandlebars from 'express-handlebars'

export function setupExpress ({ hyperspaceClient, viewData }) {
  const app = express()

  app.engine('handlebars', expressHandlebars({ defaultLayout: 'main' }))
  app.set('view engine', 'handlebars')

  app.use('/hyper', hyperdriveHttpGateway({
    client: hyperspaceClient
  }))

  app.get('/*', (req, res) => {
    res.render('index', viewData)
  })

  return app
}
