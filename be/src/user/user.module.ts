import { Module } from '@nestjs/common';
import { UserSchema } from './user.schema';

@Module({
  providers: [UserSchema],
  exports: [UserSchema],
})
export class UserModule {}
