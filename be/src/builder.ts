import SchemaBuilder, { initContextCache } from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import PrismaUtils from '@pothos/plugin-prisma-utils';
import PrismaTypes from '@pothos/plugin-prisma/generated';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import { ExtractJwt } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';

// Define the context type for the schema builder to use
// in the context of the GraphQL request lifecycle.
export interface SchemaContext {
  req: Request;
  userId?: number;
}

// Define the options for the schema builder.
interface SchemaBuilderOption {
  Context: SchemaContext;
  PrismaTypes: PrismaTypes;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    Json: {
      Input: unknown;
      Output: unknown;
    };
  };
  AuthScopes: {
    public: boolean;
    loggedIn: boolean;
  };
}

// Create the schema builder.
export function createBuilder(client: PrismaClient) {
  const builder = new SchemaBuilder<SchemaBuilderOption>({
    plugins: [ScopeAuthPlugin, PrismaPlugin, PrismaUtils],
    prisma: { client },
    // Define the auth scopes for the schema builder.
    authScopes: async (context) => ({
      public: true,
      loggedIn: !!context.userId,
    }),
    scopeAuthOptions: {
      // Handle unauthorized and forbidden errors.
      unauthorizedError: (_, context) => {
        if (!context.userId) return new Error('Unauthorized');
        return new Error('Forbidden');
      },
    },
  });

  // Add query, mutation, and scalar types.
  builder.queryType({});
  builder.mutationType({});

  return builder;
}

export type Builder = ReturnType<typeof createBuilder>;

// Create the context for the schema builder, and extract the user ID to the context.
export async function createContext(
  ctx: SchemaContext,
  jwtService: JwtService,
): Promise<SchemaContext> {
  const init = initContextCache();
  try {
    const { req } = ctx;
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new Error('No token found');

    const payload = jwtService.verify(token);
    return { ...init, ...ctx, userId: payload.userId };
  } catch (error) {
    return { ...init, ...ctx };
  }
}
