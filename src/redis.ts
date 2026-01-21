import Redis from 'ioredis';
import { env } from './env';

export const redis = env.redisPassword
	? new Redis(env.redisUrl, { password: env.redisPassword })
	: new Redis(env.redisUrl);