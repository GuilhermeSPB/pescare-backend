import { Router } from 'express'
import { locationFishingRouter } from '@modules/fishing-location-types/location-fishings.routes.js'

const routes = Router()

routes.use('/location-fishings', locationFishingRouter)

export { routes }
