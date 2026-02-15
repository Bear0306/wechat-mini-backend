import { Request, Response } from "express";
import * as UserService from "../services/user.service";

export async function getInfo(req: Request, res: Response) {
  const uid = req.user!.id;
  const data = await UserService.getUserInfo(uid);
  res.json(data);
}

export async function updateProfile(req: Request, res: Response) {
  const uid = req.user!.id;
  const userInfo = req.body;
  const data = await UserService.updateProfile(uid, userInfo.nickName, userInfo.avatarUrl);
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

// Upload avatar image
// If using TypeScript and getting "Cannot find module 'multer'" error,
// ensure you have installed 'multer' and its types: 
// npm install multer && npm install --save-dev @types/multer


export async function uploadAvatar(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "未上传头像文件" });
  }
  try {
    // Construct the public avatar path using the saved filename
    // Assume multer saves the file to './public/avatars'
    // We want to return a URL like '/avatars/<filename>'
    const avatarUrl = `${file.filename}`;
    // Optionally, update user's avatar in DB, if needed
    // await UserService.updateProfile(userId, undefined, avatarUrl);
    res.json({ avatarUrl });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "上传头像失败" });
  }
}
