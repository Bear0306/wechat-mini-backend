// @ts-nocheck
import axios from "axios";
import crypto from "crypto";
import { env } from "../env";

/**
 * Exchange js_code for openid/session_key from WeChat
 * Docs: https://developers.weixin.qq.com/miniprogram/en/dev/OpenApiDoc/user-login/code2Session.html
 */
export async function code2Session(jsCode) {
  const url = "https://api.weixin.qq.com/sns/jscode2session";

  const { data } = await axios.get(url, {
    params: {
      appid: env.wechat.appid,
      secret: env.wechat.secret,
      js_code: jsCode,
      grant_type: "authorization_code",
    },
    timeout: 8000,
    // WeChat errors often come back as 200 with errcode, but keep <500 just in case
    validateStatus: (s) => s >= 200 && s < 500,
  });

  if (!data) {
    throw new Error("Empty response from WeChat jscode2session");
  }

  if (data.errcode && data.errcode !== 0) {
    throw new Error(String(data.errcode) + ":" + (data.errmsg || "unknown error"));
  }

  if (!data.openid || !data.session_key) {
    throw new Error("Invalid jscode2session payload: missing openid/session_key");
  }

  // Return only what you actually need downstream
  return {
    openid: data.openid,
    session_key: data.session_key,
    unionid: data.unionid,
  };
}

/**
 * Decrypt WeRun (or general user) encryptedData
 * Works for AES-128-CBC with PKCS#7 padding (WeChat standard).
 * Optionally verifies watermark.appid matches your appid.
 */
export function decryptWeRun(encryptedDataB64, sessionKeyB64, ivB64, expectAppId = env.wechat.appid) {
  const key = Buffer.from(sessionKeyB64, "base64"); // must be 16 bytes after decode
  const iv = Buffer.from(ivB64, "base64");          // 16 bytes
  const ciphertext = Buffer.from(encryptedDataB64, "base64");

  if (key.length !== 16) throw new Error("Invalid session_key length (expected 16 bytes after base64)");
  if (iv.length !== 16) throw new Error("Invalid IV length (expected 16 bytes after base64)");

  let plaintext;
  try {
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(true);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (e) {
    throw new Error("WeRun decrypt failed: " + e.message);
  }

  const obj = JSON.parse(plaintext.toString("utf-8"));

  // Optional but recommended: verify watermark.appid
  if (expectAppId && obj && obj.watermark && obj.watermark.appid && obj.watermark.appid !== expectAppId) {
    throw new Error("AppID mismatch in decrypted data");
  }

  return obj;
}
