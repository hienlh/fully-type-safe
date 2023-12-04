import { Inject, Injectable } from '@nestjs/common';
import {
  Pothos,
  PothosRef,
  PothosSchema,
  SchemaBuilderToken,
} from '@smatch-corp/nestjs-pothos';
import { Builder } from 'src/builder';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostSchema extends PothosSchema {
  constructor(
    @Inject(SchemaBuilderToken) private readonly builder: Builder,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  @PothosRef()
  comment() {
    return this.builder.prismaObject('Comment', {
      fields: (t) => ({
        id: t.exposeID('id'),
        comment: t.exposeString('comment'),
        author: t.relation('author'),
      }),
    });
  }

  @PothosRef()
  post() {
    return this.builder.prismaObject('Post', {
      fields: (t) => ({
        id: t.exposeID('id'),
        title: t.exposeString('title'),
        content: t.exposeString('content', { nullable: true }),
        author: t.relation('author'),
        comments: t.relation('comments'),
      }),
    });
  }

  @Pothos()
  findAll(): void {
    this.builder.queryFields((t) => {
      return {
        posts: t.prismaField({
          type: [this.post()],
          resolve: (query, _, args) =>
            this.prisma.post.findMany({
              where: args.filter || undefined,
              ...query,
            }),
        }),
        myPosts: t.prismaField({
          type: [this.post()],
          authScopes: {
            loggedIn: true,
          },
          resolve: (query, _, args, ctx) =>
            this.prisma.post.findMany({
              where: {
                authorId: ctx.userId,
              },
              ...query,
            }),
        }),
      };
    });
  }

  @Pothos()
  create(): void {
    this.builder.mutationField('createPost', (t) => {
      return t.prismaField({
        type: this.post(),
        args: {
          title: t.arg({
            type: 'String',
            required: true,
          }),
          content: t.arg({
            type: 'String',
          }),
        },
        authScopes: {
          loggedIn: true,
        },
        resolve: (query, _p, args, ctx) => {
          return this.prisma.post.create({
            data: {
              title: args.title,
              content: args.content,
              author: {
                connect: {
                  id: ctx.userId,
                },
              },
            },
            ...query,
          });
        },
      });
    });
  }

  @Pothos()
  commentPost(): void {
    this.builder.mutationField('commentPost', (t) => {
      return t.prismaField({
        type: this.comment(),
        args: {
          postId: t.arg({
            type: 'Int',
            required: true,
          }),
          comment: t.arg({
            type: 'String',
            required: true,
          }),
        },
        authScopes: {
          loggedIn: true,
        },
        resolve: (query, _p, args, ctx) => {
          return this.prisma.comment.create({
            data: {
              comment: args.comment,
              author: {
                connect: {
                  id: ctx.userId,
                },
              },
              post: {
                connect: {
                  id: args.postId,
                },
              },
            },
          });
        },
      });
    });
  }
}
