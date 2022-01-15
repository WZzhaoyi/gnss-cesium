import { computeFixedToIcrf } from "./utils/satellite";
import { AnyObject } from "./utils/types";

export interface Link {
  gnss?: string,
  leo?: string,
  type: string | number,
  position: Array<Array<string>>,
  interval: string
}

export interface EventLinks {
  name: string,
  interval: string,
  events: Array<Link>
}

export interface LinkOption {
  eventColor: string,
  eventLink: string,
  mode: '2D' | '3D',
  label?: boolean
}

export interface LinksObject {
  interval: string,
  [key: string]: Array<Array<Link>> | string
}

/**
 * event data->czml转换工具
 * event id - e.g G01-LEO/2015-04-11T01:00:00.000Z/2015-04-11T04:59:59.000Z
 */
/**
 * @function loadEvent
 * @description 将原始事件数据转换为event obj,卫星id与sp3内容对应
 * @param val - event data
 * @param keywords - gnss satellite id 头部 G/C/R/E
 * @returns obj - e.g {interval: 事件发生时间跨度, G01-LEO: 该卫星组发生的所有事件}
 */
export function loadEventLink(val: EventLinks, keywords: Array<string>): LinksObject {
  // ‘20150411010000’ -> UTC Date Object
  function stringToDate(str: string): Date {
    if (str) {
      return new Date(Date.UTC(
        parseInt(str.slice(0, 4)),
        parseInt(str.slice(4, 6)) - 1,
        parseInt(str.slice(6, 8)),
        parseInt(str.slice(8, 10)),
        parseInt(str.slice(10, 12)),
        parseInt(str.slice(12, 14))
      ))
    }
    throw new Error('Invalid date string');
  }
  // 检查事件是否连续 而不是分段或者相同
  function checkEvent(before: Link, after: Link) {
    let isSame = true;
    if (before.gnss !== after.gnss) {
      isSame = false;
      return
    }
    if (before.leo !== after.leo) {
      isSame = false;
      return
    }
    if (before.interval === after.interval) {
      isSame = false;
      return
    }
    let start = stringToDate(before.interval.split('-')[1]);
    let end = stringToDate(after.interval.split('-')[0]);
    if (start >= end) {
      isSame = false;
      return isSame
    }
    if (end.getTime() - start.getTime() > 1000) {
      isSame = false;
      return isSame
    }
    return isSame
  }
  let obj: LinksObject = { interval: '' }
  let start = stringToDate(val.interval.split('-')[0]);
  let end = stringToDate(val.interval.split('-')[1]);
  obj['interval'] = start.toISOString() + '/' + end.toISOString();
  let lastEvent = val.events[0];
  for (let index in val.events) {
    let event = val.events[index];
    let position = event.position.map(item => {
      let date = stringToDate(item[0])
      // ecef -> eci
      let positionECI = computeFixedToIcrf(date, parseFloat(item[1]), parseFloat(item[2]), parseFloat(item[3]))
      return [date.toISOString(), positionECI.x.toString(), positionECI.y.toString(), positionECI.z.toString()]
    })
    let outGnss = true;
    for (let keyword in keywords) {
      if (event.gnss?.indexOf(keyword) !== -1) {
        outGnss = false
      }
    }
    if (outGnss) {
      continue;
    }
    let id = event.gnss + '/' + event.leo
    if (obj[id] === undefined) {
      // 创建卫星事件集合
      // [[连续事件1],[连续事件2]]
      obj[id] = [];
    }
    // 创建一次事件的对象{ type: str, interval: ISOstr/ISOstr, postion: first postion }
    let start = stringToDate(event.interval.split('-')[0]);
    let end = stringToDate(event.interval.split('-')[1]);
    let eventPart = { type: event.type, interval: start.toISOString() + '/' + end.toISOString(), position: position };
    if (checkEvent(lastEvent, event)) {
      // 若两次事件属于同一个连续事件
      // 在上一次连续事件中加入本次事件
      let index = obj[id].length - 1;
      let target = obj[id][index]
      if (Array.isArray(target)) target.push(eventPart)
    }
    else {
      // 若后一次事件分隔一段事件后发生
      // 新的连续事件
      let target = obj[id]
      if (Array.isArray(target)) target.push([eventPart])
    }
    lastEvent = event;
  }
  return obj;
}

/**
 * @function eventToCZML
 * @description - 将event Object转换为czml Object
 * @param data - 来自loadEvent()
 * @param viewProperty - 事件外观参数 与czml属性配置相关 
 * - e.g 
      eventColor: "#ffc107",
      eventLink: "solid" or “dash”,
      mode: "3D"
    },
 */
export function eventToCZML(data: LinksObject, viewProperty: LinkOption, leoID: string) {
  viewProperty;
  function eventShowAndAvailability(eventItem: Array<Array<Link>>, interval: string) {
    let show = []
    let availability = []
    let length = eventItem.length;
    if (length) {
      let start = interval.split('/')[0]
      let middle = '';
      let end = ''
      for (let index in eventItem) {
        let eventLength = eventItem[index].length;
        middle = eventItem[index][0].interval.split('/')[0]
        end = eventItem[index][eventLength - 1].interval.split('/')[1]
        let hideInterval = start + '/' + middle
        let showInterval = middle + '/' + end
        show.push({
          interval: hideInterval,
          boolean: false
        })
        show.push({
          interval: showInterval,
          boolean: true
        })
        availability.push(showInterval)
        start = end;
      }
      show.push({
        interval: start + '/' + interval.split('/')[1],
        boolean: false
      })
    }
    return { show, availability };
  }
  function eventPointPosition(eventItem: Array<Array<Link>>) {
    let positions: string[] = []
    let length = eventItem.length;
    if (length) {
      for (let index in eventItem) {
        let event = eventItem[index]
        for (let i in event) {
          let eventPart = event[i]
          let positionPart = eventPart.position
          positionPart.map(position => {
            positions.push(position[0])
            positions.push(position[1])
            positions.push(position[2])
            positions.push(position[3])
          })
        }

      }
    }
    return positions
  }
  let obj = [
    // 作为后加载的czml部分 无需加入头部
    // {
    //     "id":"document",
    //     "name":"event"+data.interval,
    //     "version":"1.0",
    //     "clock":{
    //         "interval":data.interval,
    //         // "currentTime":data.interval.split('/')[0],
    //         "multiplier":1,
    //         "range":"LOOP_STOP",
    //         "step":"SYSTEM_CLOCK_MULTIPLIER"
    //     }
    //   },
    // {
    //     "id": data.interval,
    //     "name": "Event",
    //     "description": "List of Event during:" + data.interval
    // },
  ]
  let eventColor = viewProperty.eventColor;
  let color = [parseInt("0x" + eventColor.slice(1, 3)), parseInt("0x" + eventColor.slice(3, 5)), parseInt("0x" + eventColor.slice(5, 7))];
  let alpha = 255;
  let width = 0.8;
  let scale = 1;
  if (viewProperty.eventLink === 'dash') {
    width = 0.3;
    alpha = 160
  }
  for (let index in data) {
    let event = data[index]
    if (typeof event === 'string') { continue; }
    let gnss = index.split('/')[0]
    let leo = index.split('/')[1]
    let references = [gnss + '#position', leo + '#position']
    if (leoID) {
      references = [index.split('/')[0] + '#position', leoID + '#position']
    }
    let position = eventPointPosition(event)
    let eventObj: AnyObject = {
      id: index + '/' + data.interval,
      name: index,
      parent: data.interval,
      description: `<p>GNSS:${gnss} LEO:${leo}`,
      availability: [''],
      polyline: {
        show: false,
        width: width,
        material: {
          solidColor: {
            color: { "rgba": [color[0], color[1], color[2], alpha] },
          }
        },
        followSurface: false,
        positions: {
          references: references
        }
      },
      point: {
        "pixelSize": 8,
        "color": { "rgba": [color[0], color[1], color[2], alpha] },
        "show": true,
      },
      position: {
        "interpolationAlgorithm": "LAGRANGE",
        "interpolationDegree": 2,
        "referenceFrame": "INERTIAL",
        "cartesian": position,
      }
    }
    let showAndAvailability = eventShowAndAvailability(event, data.interval)
    eventObj.availability = showAndAvailability.availability;
    eventObj.polyline.show = viewProperty.mode === '2D' ? false : showAndAvailability.show;
    eventObj.point.show = showAndAvailability.show;
    if (viewProperty?.label) {
      eventObj["label"] = {
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
        scale: 0.5 * scale,
        show: showAndAvailability.show,
        style: 'FILL_AND_OUTLINE',
        text: gnss,
        verticalOrigin: 'CENTER'
      }
    }
    obj.push(eventObj)
  }
  return obj
}