import { Request, Response } from "express";
import * as UserService from "../services/user.service";

export async function getInfo(req: Request, res: Response) {
  const uid = req.user!.id;
  const data = await UserService.getUserInfo(uid);
  res.json(data);
}

export async function fetchCount(req: Request, res: Response) {
  const uid = req.user!.id;
  const data = await UserService.getUserCount(uid);
  res.json(data);
}

export async function stepsUpload(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const { encryptedData, iv, code } = req.body;

  const data = await UserService.uploadSteps({
    userId,
    encryptedData,
    iv,
    code,
  });

  res.json(data);
}