/** /api/admin/* — toda a API do painel passa pelo roteador em server/admin.ts. */
import { rotaAdmin } from '../../../server/admin'
import type { Ctx } from '../../../server/util'

export const onRequest = (ctx: Ctx) => rotaAdmin(ctx)
