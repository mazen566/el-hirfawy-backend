import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../user/user.schema.js';

@Schema()
export class Admin extends User {}

export const AdminSchema = SchemaFactory.createForClass(Admin);
