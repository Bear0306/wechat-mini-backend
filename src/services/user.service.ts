import { DateTime } from 'luxon';
import { env } from '../env';
import { code2Session, decryptWeRun } from "../adapters/wechat";
import * as UserModel from '../models/user.model';
import * as UserStepsModel from '../models/usersteps.model';
import * as ContestModel from '../models/contest.model';
import * as ContestentryModel from '../models/contestentry.model';

type StepInfo = {
  timestamp: number
  step: number
}

export async function getUserById(id: number) {
  return UserModel.getUserById(id);
}

export async function getUserByOpenId(openid: string) {
  return UserModel.getUserByOpenId(openid);
}

export async function upsertUserByOpenid(openid: string) {
  return UserModel.upsertUserByOpenid(openid);
}

export async function upsertUserSteps( userId: number, newStepInfoList: StepInfo[] ) {
  const SECONDS_PER_DAY = 86400
  const DAYS = 35

  const tz = env.tz;
  const today = DateTime.now().setZone(tz).startOf('day');
  const cutoffTimestamp = today.toSeconds() - DAYS * SECONDS_PER_DAY

  // Read existing steps from DB
  const userStepList = await UserStepsModel.getUserStepsList(userId);

  let combinedSteps: StepInfo[] = []

  if (userStepList.length > 0) {
    try {
      const existingSteps: StepInfo[] = userStepList
      combinedSteps = [...existingSteps, ...newStepInfoList]
    } catch {
      combinedSteps = [...newStepInfoList]
    }
  } else {
    combinedSteps = [...newStepInfoList]
  }

  // Deduplicate by timestamp (keep latest from newStepInfoList)
  const stepMap = new Map<number, StepInfo>()
  combinedSteps.forEach(step => stepMap.set(step.timestamp, step))
  combinedSteps = Array.from(stepMap.values())

  // Keep only last 35 days and sort
  const filteredSteps = combinedSteps
    .filter(item => item.timestamp >= cutoffTimestamp)
    .sort((a, b) => a.timestamp - b.timestamp)

  const contests = await ContestModel.getOngoingContestEntries();

  // Flatten Contest -> entries into your desired structure
  const flattened = contests.flatMap(contest =>
    contest.entries.map(entry => ({
      contestId: contest.id,
      startAt: contest.startAt,
      endAt: contest.endAt,
      entryId: entry.id,
      userId: entry.userId
      }))
  )

  const filteredRows = flattened.filter(row => row.userId === userId)

  // Add steps to each contest
  const result = filteredRows.map(contest => {
    const startTs = Math.floor(contest.startAt.getTime() / 1000) - 24 * 3600 + 1;
    const endTs = Math.floor(contest.endAt.getTime() / 1000);
    
    const totalSteps = filteredSteps
      .filter(step => step.timestamp >= startTs && step.timestamp < endTs)
      .reduce((sum, step) => sum + step.step, 0);

    return { ...contest, steps: totalSteps };
  });


  for (const contest of result) {
    await ContestentryModel.upsertUserSteps(contest.entryId, contest.steps);
  }

  UserStepsModel.upsertUserStepsList(userId, filteredSteps);
}

export async function decUserJoinCount(userId: number) {
    const cur_count = await UserModel.getUserJoinCount(userId);
    if (!cur_count || cur_count <= 0) {
      throw { status: 404, message: '找不到用户' };
    }
    const new_count = Math.max(0, cur_count - 1);
    // 3️⃣ Update the user
    await UserModel.updateUserJoinCount(userId, new_count);
}

export async function getUserInfo(uid: number) {
  const user = await UserModel.findUserBasic(uid);
  if (!user) throw new Error("用户不存在");

  const weekStart = DateTime.now().setZone(env.tz).startOf('week').toSeconds();

  const steps = await UserStepsModel.getUserStepsList(uid);
  const list = steps ?? [];

  const weekSteps = list
    .filter(i => i.timestamp >= weekStart)
    .reduce((sum, i) => sum + i.step, 0);

  return {
    uid: user.id,
    nickname: user.wechatNick || '',
    avatar: user.avatarUrl || '',
    weekSteps,
    joinCount: user.joinCount,
    prizeMultiplier: user.prizeMultiplier,
  };
}

export async function updateProfile(uid: number, nickname: string, avatar: string) {
  return UserModel.updateUserProfile(uid, nickname, avatar);
}

export async function getUserCount(uid: number) {
  const user = await UserModel.findUserCount(uid);
  if (!user) throw new Error("用户不存在");

  return user;
}

export async function uploadSteps(params: {
  userId: number;
  encryptedData: string;
  iv: string;
  code: string;
}) {
  const { userId, encryptedData, iv, code } = params;

  const wxRes = await code2Session(code);
  const sessionKey = wxRes.session_key;

  const data = decryptWeRun(encryptedData, sessionKey, iv);

  const stepInfoList = [...data.stepInfoList];
  while (stepInfoList.length && stepInfoList[0].step === 0) {
    stepInfoList.shift();
  }

  if (stepInfoList.length) {
    await upsertUserSteps(userId, stepInfoList);
  }

  return {
    werun: {
      stepInfoList: data.stepInfoList ?? [],
    },
  };
}