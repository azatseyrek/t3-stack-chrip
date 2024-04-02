import { clerkClient } from '@clerk/nextjs/server';
import type { Post } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { filterUserForClient } from '~/server/helpers/filterUserForClient';

const addUserDataToPosts = async (posts: Post[]) => {
  const userId = posts.map((post) => post.authorId);
  const users = (
    await clerkClient.users.getUserList({
      userId: userId,
      limit: 110,
    })
  ).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);

    if (!author) {
      console.error('AUTHOR NOT FOUND', post);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Author for post not found. POST ID: ${post.id}, USER ID: ${post.authorId}`,
      });
    }
    if (!author.username) {
      // user the ExternalUsername
      if (!author.externalUsername) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Author has no GitHub Account: ${author.id}`,
        });
      }
      author.username = author.username;
    }
    return {
      post,
      author: {
        ...author,
        username: author.username ?? '(username not found)',
      },
    };
  });
};

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  analytics: true,
});

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    console.log(posts, '---posts---');

    return addUserDataToPosts(posts);
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const post = await ctx.db.post.findUnique({
      where: { id: input.id },
    });
    if (!post) {
      throw new Error('Post not found');
    }
    return (await addUserDataToPosts([post]))[0];
  }),

  create: publicProcedure
    .input(z.object({ content: z.string().min(1), authorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // simulate a slow db call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await ratelimit.limit(input.authorId);

      const post = ctx.db.post.create({
        data: {
          authorId: input.authorId,
          content: input.content,
        },
      });
      return post;
    }),

  getLatest: publicProcedure.query(({ ctx }) => {
    return ctx.db.post.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }),
});
