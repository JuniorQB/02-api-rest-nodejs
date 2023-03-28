import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'

import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    console.log(`[${req.method}] - ${req.url}`)
  })

  // busca todos

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .select('*')
        .where('session_id', sessionId)

      return response.status(200).send({ transactions })
    },
  )

  // busca por id
  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, resp) => {
      const selectIdParam = z.object({
        id: z.string().uuid(),
      })
      const { sessionId } = request.cookies
      const { id } = selectIdParam.parse(request.params)
      const transactions = await knex('transactions')
        .select('*')
        .where({
          id,
          session_id: sessionId,
        })
        .first()

      return resp.status(200).send({ transactions })
    },
  )

  app.post('/', async (req, resp) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(req.body)

    let sessionId = req.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()
      resp.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7days - Milisegundos * segundos * minutos * horas * dias
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return resp.status(201).send()
  })

  app.get(
    '/sumary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const { sessionId } = request.cookies
      const sumary = await knex('transactions')
        .sum('amount', { as: 'amount' })
        .where('session_id', sessionId)
        .first()

      return sumary
    },
  )
}
