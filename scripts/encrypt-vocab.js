#!/usr/bin/env node
// encrypt-vocab.js — 将 vocab.json 加密为 vocab.enc
// 用法：node encrypt-vocab.js [input] [output]
// 格式：Base64( iv(12字节) + ciphertext + authTag(16字节) )

const fs = require('fs');
const crypto = require('crypto');

// 密钥（32字节 hex = AES-256）— 同步更新 js/api.js 中的 VOCAB_KEY
const KEY_HEX = 'a3f1b2c4d5e6f708192a3b4c5d6e7f80a1b2c3d4e5f60718293a4b5c6d7e8f90';

const input = process.argv[2] || 'vocab.json';
const output = process.argv[3] || 'vocab.enc';

const plaintext = fs.readFileSync(input, 'utf8');
const key = Buffer.from(KEY_HEX, 'hex');
const iv = crypto.randomBytes(12); // AES-GCM 标准 12 字节 IV

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag(); // 16 字节

// 拼接：iv + encrypted + authTag → Base64
const combined = Buffer.concat([iv, encrypted, authTag]);
fs.writeFileSync(output, combined.toString('base64'));

console.log(`✅ ${input} (${plaintext.length}B) → ${output} (${combined.length}B, base64: ${Math.ceil(combined.length * 4/3)}B)`);
