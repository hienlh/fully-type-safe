import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PothosModule } from '@smatch-corp/nestjs-pothos';
import { PothosApolloDriver } from '@smatch-corp/nestjs-pothos-apollo-driver';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchemaContext, createBuilder, createContext } from './builder';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    PostModule,
    JwtModule.register({
      global: true,
      secret: 'YourSecretKey',
      signOptions: { expiresIn: '365d' },
    }),
    PothosModule.forRoot({
      builder: {
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => createBuilder(prisma),
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      inject: [JwtService],
      driver: PothosApolloDriver,
      useFactory: (jwtService: JwtService) => {
        return {
          introspection: process.env.NODE_ENV !== 'production',
          playground: false,
          context: (ctx: SchemaContext) => createContext(ctx, jwtService),
          plugins:
            process.env.NODE_ENV !== 'production'
              ? [ApolloServerPluginLandingPageLocalDefault()]
              : [],
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
