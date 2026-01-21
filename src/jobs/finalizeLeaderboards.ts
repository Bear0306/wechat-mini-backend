import cron from 'node-cron';
import { prisma } from '../db';
import { finalize } from '../services/leaderboard.service';
cron.schedule('55 21 * * *', async() => {
    console.log('Finalizing job started');
    const active = await prisma.contest.findMany({where: {}});
    
    for(const c of active){
        await finalize(c.id);
    }
    console.log('Finalizing job completed');
});