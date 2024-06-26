import { PermissionsVerifier } from '@/server/permissions/PermissionsVerifier'
import { protectedProcedure } from '@/server/trpc/trpc'
import { PermissionAction } from '@/shared/permissions/permissionDefinitions'
import { z } from 'zod'
import { chatEditionFilter } from '../chatsBackendUtils'

const zInput = z.object({
  id: z.string(),
})

export const deleteChat = protectedProcedure
  .input(zInput)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id

    const { id } = input

    const chat = await ctx.prisma.chat.findFirstOrThrow({
      where: {
        id,
        ...chatEditionFilter(userId),
      },
    })

    await new PermissionsVerifier(ctx.prisma).callOrThrowTrpcError(
      PermissionAction.Use,
      userId,
      chat.postId,
    )

    return await ctx.prisma.chat.delete({
      where: {
        id: input.id,
      },
    })
  })
