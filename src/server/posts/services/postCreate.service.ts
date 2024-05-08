import { workspaceEditionFilter } from '@/components/workspaces/backend/workspacesBackendUtils'
import type { UserOnWorkspaceContext } from '@/server/auth/userOnWorkspaceContext'
import { prismaAsTrx } from '@/server/lib/prismaAsTrx'
import { Author } from '@/shared/aiTypesAndMappers'
import { DEFAULT_AI_MODEL } from '@/shared/globalConfig'
import {
  ShareScope,
  type PrismaClientOrTrxClient,
  type PrismaTrxClient,
} from '@/shared/globalTypes'
import { updatePostSortingService } from './updatePostSorting.service'

interface PostCreateServiceInputProps {
  title?: string
  emoji?: string
  isDefault?: boolean
  isDemo?: boolean
}

export const postCreateService = async (
  prisma: PrismaClientOrTrxClient,
  uowContext: UserOnWorkspaceContext,
  input: PostCreateServiceInputProps,
) => {
  return await prismaAsTrx(prisma, async (prisma: PrismaTrxClient) => {
    const { userId, workspaceId } = uowContext
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    })

    const targetModel = user.defaultModel ?? DEFAULT_AI_MODEL

    // Check edition permissions on workspace
    await prisma.workspace.findUniqueOrThrow({
      select: {
        id: true,
      },
      where: {
        id: workspaceId,
        ...workspaceEditionFilter(userId),
      },
    })
    const post = await createPost(
      prisma,
      workspaceId,
      userId,
      targetModel,
      input,
    )

    const chat = await prisma.chat.findFirstOrThrow({
      select: {
        id: true,
      },
      where: {
        postId: post.id,
        authorId: userId,
      },
    })

    if (!post.isDefault) {
      await updatePostSortingService(prisma, uowContext, post.id)
    }

    return { ...post, firstChatId: chat.id }
  })
}

const createPost = async (
  prisma: PrismaTrxClient,
  workspaceId: string,
  userId: string,
  targetModel: string,
  input: PostCreateServiceInputProps,
) => {
  return await prisma.post.create({
    data: {
      workspaceId,
      userId,
      ...input,
      shares: {
        create: [
          {
            scope: ShareScope.Everybody,
          },
        ],
      },
      chats: {
        create: [
          {
            authorId: userId,
          },
        ],
      },
      postConfigVersions: {
        create: [
          {
            model: targetModel,
            messages: {
              create: [
                {
                  author: Author.System,
                },
              ],
            },
          },
        ],
      },
    },
  })
}
