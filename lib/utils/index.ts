import * as satellite from './satellite'

/**
 * @param {date} time 需要转换的时间
 * @param {String} fmt 需要转换的格式 如 yyyy-MM-dd、yyyy-MM-dd HH:mm:ss
 */
export function formatTime(time: Date | string | number, fmt: string = 'yyyy-MM-dd HH:mm:ss'): string {
  interface TimeObject {
    'M+': number;
    'd+': number;
    'H+': number;
    'm+': number;
    's+': number;
    'q+': number;
    S: number;
  }
  if (!time) return '';
  else {
    const date = new Date(time);
    const o: TimeObject = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'H+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds(),
      'q+': Math.floor((date.getMonth() + 3) / 3),
      S: date.getMilliseconds(),
    };
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        (date.getFullYear() + '').substr(4 - RegExp.$1.length)
      );
    let k: keyof TimeObject
    for (k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k].toString()
            : ('00' + o[k]).substr(('' + o[k]).length)
        );
      }
    }
    return fmt;
  }
}

export default {
  formatTime,
  satellite
}