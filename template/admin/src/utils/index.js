// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2023 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------
import { Message } from 'element-ui';

export const IMAGE_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.bmp', '.ico'];
export const IMAGE_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/x-ms-bmp',
  'image/vnd.microsoft.icon',
  'image/x-icon',
];
export const VIDEO_UPLOAD_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.ogv',
  '.avi',
  '.wmv',
  '.rm',
  '.mpg',
  '.mpeg',
  '.flv',
];
export const VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-quicktime',
  'video/x-m4v',
  'video/ogg',
  'video/x-msvideo',
  'video/avi',
  'video/x-ms-wmv',
  'application/vnd.rn-realmedia',
  'video/vnd.rn-realvideo',
  'video/mpeg',
  'video/x-flv',
];
export const IMAGE_UPLOAD_ACCEPT = [...IMAGE_UPLOAD_EXTENSIONS, ...IMAGE_UPLOAD_MIME_TYPES].join(',');
export const VIDEO_UPLOAD_ACCEPT = [...VIDEO_UPLOAD_EXTENSIONS, ...VIDEO_UPLOAD_MIME_TYPES].join(',');

function getUploadFile(file) {
  return file && file.raw ? file.raw : file || {};
}

function getFileExtension(file) {
  const name = String((file && file.name) || '');
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function matchesUploadType(file, extensions, mimeTypes) {
  const uploadFile = getUploadFile(file);
  const extension = getFileExtension(file && file.name ? file : uploadFile);
  if (!extensions.includes(extension)) return false;
  const mimeType = String(uploadFile.type || file.type || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  return !mimeType || mimeType === 'application/octet-stream' || mimeTypes.includes(mimeType);
}
export function importAll(r) {
  let __modules = {};
  r.keys().forEach((key) => {
    let m = r(key).default;
    let n = m.name;
    __modules[n] = m;
  });
  return __modules;
}

export function isPicUpload(file) {
  const isImage = matchesUploadType(file, IMAGE_UPLOAD_EXTENSIONS, IMAGE_UPLOAD_MIME_TYPES);
  if (!isImage) {
    Message.error('图片仅支持 jpg、jpeg、png、gif、webp、avif、svg、bmp、ico 格式');
  }
  return isImage;
}

export function isVoiceUpload(file) {
  const typeArry = ['.mp3', '.MP3'];
  const type = file.name.substring(file.name.lastIndexOf('.'));
  const isImage = typeArry.indexOf(type) > -1;
  if (!isImage) {
    Message.error('上传音频格式不对');
  }
  return isImage;
}

export function isVideoUpload(file) {
  const isVideo = matchesUploadType(file, VIDEO_UPLOAD_EXTENSIONS, VIDEO_UPLOAD_MIME_TYPES);
  if (!isVideo) {
    Message.error('视频文件格式不支持；m3u8 请使用视频链接');
  }
  return isVideo;
}

export function isFileUpload(file) {
  const typeArry = ['.doc', '.DOC', '.docx', '.xls', '.xlsx'];
  const type = file.name.substring(file.name.lastIndexOf('.'));
  const isFile = typeArry.indexOf(type) > -1;
  if (!isFile) {
    Message.error('上传文件格式不对');
  }
  return isFile;
}
export function isXlsUpload(file) {
  const typeArry = ['.xls', '.xlsx'];
  const type = file.name.substring(file.name.lastIndexOf('.'));
  const isFile = typeArry.indexOf(type) > -1;
  if (!isFile) {
    Message.error('上传文件格式不对');
  }
  return isFile;
}

export function arraysEqual(arr1, arr2) {
  // 如果两个数组的长度不同，直接返回 false
  if (arr1.length !== arr2.length) {
    return false;
  }

  // 将两个数组分别排序
  const sortedArr1 = arr1.slice().sort();
  const sortedArr2 = arr2.slice().sort();

  // 比较排序后的数组
  for (let i = 0; i < sortedArr1.length; i++) {
    if (sortedArr1[i] !== sortedArr2[i]) {
      return false;
    }
  }

  return true;
}
