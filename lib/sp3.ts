import { formatTime } from './utils';
import { computeFixedToIcrf } from './utils/satellite';

export interface sp3Option {
  leoColor: string;
  leoBillboard: string
  gnssColor: GNSSMap;
}

export interface GNSSMap {
  GPS: any;
  BDS: any;
  GAL: any;
  GLO: any;
}

export const GNSSId: GNSSMap = {
  GPS: 'G',
  BDS: 'C',
  GAL: 'E',
  GLO: 'R'
};

const IdGNSS: Map<string, string> = new Map();
let name: keyof GNSSMap;
for (name in GNSSId) {
  IdGNSS.set(GNSSId[name], name);
}

export function getColorArray(hex: string) {
  return [
    parseInt('0x' + hex.slice(1, 3)),
    parseInt('0x' + hex.slice(3, 5)),
    parseInt('0x' + hex.slice(5, 7))
  ];
}

/**
 * @function loadSp3
 * @description 将.sp3文件转换为sp3 obj,所有坐标从ecef转换为eci, web worker
 * @param val {.sp3}  - 文件内容
 * @param keyword {string}  - satellite id 头部 G/C/R/E/L
 */
export function loadSp3(val: string, keyword: string) {
  let obj = {} as any;
  if (!keyword) {
    keyword = 'P';
  }
  let value = val.split('\n');
  let i = 0;
  while (value[i].indexOf('EOF') === -1 && i <= 100) {
    if (value[i][0] === '*') {
      break;
    } else i++;
  }
  // 开始时间
  let splitLine = value[i++].trim().split(/\s+/) as Array<string>;
  let start = new Date(
    Date.UTC(
      parseInt(splitLine[1]),
      parseInt(splitLine[2]) - 1,
      parseInt(splitLine[3]),
      parseInt(splitLine[4]),
      parseInt(splitLine[5]),
      0
    )
  );
  let date = start;
  // 遍历卫星位置
  while (i < value.length) {
    i++;
    let splitLine = value[i].trim().split(/\s+/) as Array<string>;
    if (splitLine[0] === '*') {
      date = new Date(
        Date.UTC(
          parseInt(splitLine[1]),
          parseInt(splitLine[2]) - 1,
          parseInt(splitLine[3]),
          parseInt(splitLine[4]),
          parseInt(splitLine[5]),
          0
        )
      );
      continue;
    }
    if (splitLine[0].indexOf('EOF') > -1) {
      // 把一个日期转换为符合 ISO 8601 扩展格式的字符串。开始/结束
      obj.interval = start.toISOString() + '/' + date.toISOString();
      break;
    }
    if (splitLine[0].indexOf('V') > -1) {
      continue;
    } else if (splitLine[0].indexOf(keyword) > -1) {
      let name = splitLine[0].slice(1);
      let position = computeFixedToIcrf(
        date,
        parseFloat(splitLine[1]),
        parseFloat(splitLine[2]),
        parseFloat(splitLine[3])
      );
      if (obj[name] !== undefined) {
        obj[name].push(date.toISOString()); // time
        obj[name].push(position.x * 1000); // x
        obj[name].push(position.y * 1000); // y
        obj[name].push(position.z * 1000); // z
        continue;
      }
      // 创建卫星 [iso time,x m,y m,z m]
      obj[name] = [
        date.toISOString(),
        position.x * 1000,
        position.y * 1000,
        position.z * 1000
      ];
    }
  }
  return obj;
}

/**
 * @function sp3ToCZML
 * @description 将sp3 Object转换为czml Object, web worker
 * @param val - 来自sp3loader()
 * @param viewProperty - 外观参数 与czml属性配置相关
 * @param start - 最早时间
 * @param end - 最晚时间
 * @param keywords - gnss satellite id 头部 G/C/R/E
 */
export function sp3ToCZML(
  val: Array<any>,
  viewProperty: sp3Option,
  start: Date,
  end: Date,
  keywords?: Array<string>
) {
  const baseAlpha = 200;
  let obj: any[] = [];
  let color = getColorArray(viewProperty.leoColor);
  const gnssColor: GNSSMap = {
    GPS: getColorArray(viewProperty.gnssColor.GPS),
    BDS: getColorArray(viewProperty.gnssColor.BDS),
    GAL: getColorArray(viewProperty.gnssColor.GAL),
    GLO: getColorArray(viewProperty.gnssColor.GLO)
  };
  let scale = 1;
  let showPath = true;
  let show = true;
  let alpha = baseAlpha;
  let model = 'point';
  let interval = start.toISOString() + '/' + end.toISOString();
  val.forEach((content) => {
    Object.keys(content).map((key) => {
      if (key !== 'interval') {
        // 过滤无用卫星
        if (keywords && keywords.length) {
          let idx = -1;
          for (let keyword of keywords) {
            let tmp = key.indexOf(keyword);
            if (tmp !== -1) {
              idx = tmp;
              break;
            }
          }
          if (idx === -1) return;
        }
        // 轨道周期，gnss较大，leo较小
        let period = 12800;
        let GNSS = IdGNSS.get(key[0]) as keyof GNSSMap | undefined;
        if (GNSS) {
          // gnss 样式
          scale = 0.5;
          alpha = 128;
          period = 43200;
          color = gnssColor[GNSS];
        } else {
          model = 'billboard';
        }
        let sate: any = {
          // czml 卫星对象
          id: key,
          name: 'satellite',
          availability: interval,
          description: `${key}\r\n${formatTime(start)}->${formatTime(end)}`
        };
        if (model === 'point') {
          sate['point'] = {
            pixelSize: 10 * scale,
            color: { rgba: [color[0], color[1], color[2], alpha] },
            show: show
          };
        } else if (model === 'billboard') {
          sate['billboard'] = {
            eyeOffset: {
              cartesian: [0, 0, 0]
            },
            horizontalOrigin: 'CENTER',
            image: viewProperty.leoBillboard,
            pixelOffset: {
              cartesian2: [0, 0]
            },
            scale: 0.05 * scale,
            show: true,
            verticalOrigin: 'CENTER'
          };
        }
        sate['label'] = {
          fillColor: {
            rgba: [color[0], color[1], color[2], alpha]
          },
          font: '11pt Lucida Console',
          horizontalOrigin: 'LEFT',
          outlineColor: {
            rgba: [255, 255, 255, alpha]
          },
          outlineWidth: 0.5,
          pixelOffset: {
            cartesian2: [12, 0]
          },
          scale: 2 * scale,
          show: show,
          style: 'FILL_AND_OUTLINE',
          text: key,
          verticalOrigin: 'CENTER'
        };
        if (!GNSS) {
          sate['path'] = {
            show: [
              {
                interval: interval,
                boolean: showPath && show
              }
            ],
            width: 0.5,
            material: {
              solidColor: {
                color: {
                  rgba: [color[0], color[1], color[2], alpha]
                }
              }
            },
            leadTime: 0,
            // leadTime: period / 2,
            trailTime: period,
            resolution: 240
          };
        }
        sate['position'] = {
          interpolationAlgorithm: 'LAGRANGE',
          interpolationDegree: 2,
          referenceFrame: 'INERTIAL',
          epoch: interval.split('/')[0],
          cartesian: content[key]
        };
        obj.push(JSON.parse(JSON.stringify(sate)));
      }
    });
  });

  return obj;
}
