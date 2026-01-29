import cron from 'node-cron';
import { updateContestStatus } from '../services/contest.service';

cron.schedule('0 * * * *', async () => {
  await updateContestStatus();
});