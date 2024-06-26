import { createUserOnWorkspaceContext } from '@/server/auth/userOnWorkspaceContext'
import { createChatService } from '@/server/chats/services/createChat.service'
import { protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'

const zInput = z.object({
  postId: z.string(),
})

export const createChat = protectedProcedure
  .input(zInput)
  .mutation(async ({ ctx, input }) => {
    const { postId } = input

    const userId = ctx.session.user.id

    const post = await ctx.prisma.post.findFirstOrThrow({
      where: {
        id: postId,
      },
    })

    const context = await createUserOnWorkspaceContext(
      ctx.prisma,
      post.workspaceId,
      userId,
    )

    return await createChatService(ctx.prisma, context, input)
  })
