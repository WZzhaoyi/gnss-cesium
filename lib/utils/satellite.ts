export function computeFixedToIcrf(date: Date, x: number, y: number, z: number) {
  const pi = Math.PI;
  const twoPi = pi * 2;
  const deg2rad = pi / 180.0;

  function jdayInternal(
    year: number,
    mon: number,
    day: number,
    hr: number,
    minute: number,
    sec: number,
    msec = 0
  ) {
    return (
      367.0 * year -
      Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) +
      Math.floor((275 * mon) / 9.0) +
      day +
      1721013.5 +
      ((msec / 60000 + sec / 60.0 + minute) / 60.0 + hr) / 24.0 // ut in days
      // # - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
    );
  }

  function jday(time: Date) {
    if (time instanceof Date) {
      const date = time;
      return jdayInternal(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
      );
    }

    throw new Error('date error');
  }

  function gstimeInternal(jdut1: number) {
    const tut1 = (jdut1 - 2451545.0) / 36525.0;

    let temp =
      -6.2e-6 * tut1 * tut1 * tut1 +
      0.093104 * tut1 * tut1 +
      (876600.0 * 3600 + 8640184.812866) * tut1 +
      67310.54841; // # sec
    temp = ((temp * deg2rad) / 240.0) % twoPi; // 360/86400 = 1/240, to deg, to rad

    //  ------------------------ check quadrants ---------------------
    if (temp < 0.0) {
      temp += twoPi;
    }

    return temp;
  }

  function gstime(date: Date) {
    return gstimeInternal(jday(date));
  }

  function ecfToEci(ecf: { x: number; y: number; z: number }, gmst: number) {
    // ccar.colorado.edu/ASEN5070/handouts/coordsys.doc
    //
    // [X]     [C -S  0][X]
    // [Y]  =  [S  C  0][Y]
    // [Z]eci  [0  0  1][Z]ecf
    //
    const X = ecf.x * Math.cos(gmst) - ecf.y * Math.sin(gmst);
    const Y = ecf.x * Math.sin(gmst) + ecf.y * Math.cos(gmst);
    const Z = ecf.z;
    return { x: X, y: Y, z: Z };
  }

  if (date instanceof Date) {
    let gmst = gstime(date);
    return ecfToEci({ x, y, z }, gmst);
  } else {
    throw new Error('date error');
  }
}