import { Primitive, PrimitiveCollection } from "cesium";

export interface PrimitiveMeta {
  primitive: Primitive,
  Id: string,
  description: string,
  time: Date
}

export class TimePrimitiveCollection extends PrimitiveCollection {
  timeline?: PrimitiveMeta[]
  metas: WeakMap<Primitive, PrimitiveMeta>
  constructor(options?: Object) {
    super(options)
    this.metas = new WeakMap()
    this.showInterval.bind(this)
  }
  getById(Id: string) {
    // _primitives is a private Array in collection
    // @ts-ignore
    for (let primitive of super._primitives) {
      const meta = this.metas.get(primitive)
      if (meta && meta?.Id === Id) {
        return primitive
      }
    }
    return undefined
  }
  add(meta: PrimitiveMeta) {
    const { primitive } = meta
    if (!this.contains(primitive)) {
      super.add(primitive)
    }
    if (!this.metas.has(primitive)) {
      this.metas.set(primitive, meta)
    }
  }
  showInterval(start: Date, end: Date) {
    // _primitives is a private Array in collection
    // @ts-ignore
    super._primitives.foreach((primitive: Primitive) => {
      const meta = this.metas.get(primitive)
      if (meta && 'time' in meta) {
        const { time } = meta
        if (time >= start && time <= end) {
          primitive.show = true
        }
        else {
          primitive.show = false
        }
      }
    })
  }
}

