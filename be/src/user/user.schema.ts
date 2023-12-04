import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import {
  Pothos,
  PothosRef,
  PothosSchema,
  SchemaBuilderToken,
} from '@smatch-corp/nestjs-pothos';
import * as bcrypt from 'bcryptjs';
import { Builder } from 'src/builder';
import { PrismaService } from 'src/prisma/prisma.service';

export class LoginResponse {
  user?: User;
  token?: string;
}

@Injectable()
export class UserSchema extends PothosSchema {
  constructor(
    @Inject(SchemaBuilderToken) private readonly builder: Builder,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  @PothosRef()
  user() {
    return this.builder.prismaObject('User', {
      fields: (t) => ({
        id: t.exposeInt('id'),
        email: t.exposeString('email'),
        name: t.exposeString('name', { nullable: true }),
      }),
    });
  }

  @Pothos()
  register() {
    this.builder.mutationField('register', (t) => {
      return t.prismaField({
        type: this.user(),
        args: {
          email: t.arg({
            type: 'String',
            required: true,
          }),
          name: t.arg({
            type: 'String',
          }),
          password: t.arg({
            type: 'String',
            required: true,
          }),
        },
        resolve: (_, _p, args) =>
          this.prisma.user.create({
            data: {
              email: args.email,
              name: args.name,
              encryptedPassword: bcrypt.hashSync(args.password, 10),
            },
          }),
      });
    });
  }

  @PothosRef()
  loginResponse() {
    this.builder.objectType(LoginResponse, {
      name: 'LoginResponse',
      fields: (t) => ({
        user: t.field({
          type: this.user(),
          nullable: true,
          resolve: (parent) => parent.user,
        }),
        token: t.field({
          type: 'String',
          nullable: true,
          resolve: (parent) => parent.token,
        }),
      }),
    });
  }

  @Pothos()
  login() {
    this.builder.mutationField('login', (t) => {
      return t.field({
        type: LoginResponse,
        args: {
          email: t.arg({
            type: 'String',
            required: true,
          }),
          password: t.arg({
            type: 'String',
            required: true,
          }),
        },
        resolve: async (_, args) => {
          const user = await this.prisma.user.findUnique({
            where: { email: args.email },
          });

          if (!user) {
            throw new Error('User not found');
          }

          if (
            !bcrypt.compareSync(args.password, user.encryptedPassword || '')
          ) {
            throw new Error('Invalid password');
          }

          return {
            user,
            token: this.jwtService.sign({ userId: user.id }),
          };
        },
      });
    });
  }

  @Pothos()
  me() {
    this.builder.queryField('me', (t) => {
      return t.prismaField({
        type: this.user(),
        authScopes: {
          loggedIn: true,
        },
        nullable: true,
        resolve: (_, __, ___, ctx) => {
          return this.prisma.user.findUnique({
            where: {
              id: ctx.userId,
            },
          });
        },
      });
    });
  }
}
