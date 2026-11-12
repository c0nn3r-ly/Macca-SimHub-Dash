// SimHub ES5 dashboard variable: 0 hidden, 1 BBal, 2 ABS, 3 TC1.
// One controller owns change detection; visual items use numeric NCalc bindings.
var HOLD_MS = 2000;
function read(names) {
    for (var i = 0; i < names.length; i++) {
        try {
            var v = $prop(names[i]);
            if (v !== null && v !== undefined && String(v) !== '') return v;
        } catch (e) {}
    }
    return null;
}
function numeric(name) {
    var names = ['DataCorePlugin.GameData.NewData.' + name, name];
    for (var i = 0; i < names.length; i++) {
        var v = read([names[i]]);
        if (v !== null && isFinite(Number(v))) return Number(v);
    }
    return null;
}
var running = read(['GameRunning', 'DataCorePlugin.GameRunning']);
if (!(running === true || running === 1 || running === '1' || String(running).toLowerCase() === 'true')) {
    root.maccaPopup = null;
    return 0;
}
var now = Date.now();
var bias = numeric('BrakeBias');
if (bias !== null) bias = Math.round((bias <= 1 ? bias * 100 : bias) * 10) / 10;
var values = [bias, numeric('ABSLevel'), numeric('TCLevel')];
var car = String(read(['CarId', 'DataCorePlugin.GameData.NewData.CarId']) || '');
var track = String(read(['TrackCode', 'DataCorePlugin.GameData.NewData.TrackCode']) || '');
var lap = numeric('CompletedLaps');
var s = root.maccaPopup;
if (!s || s.car !== car || s.track !== track || now < s.time ||
    (lap !== null && s.lap !== null && lap < s.lap)) {
    root.maccaPopup = {car: car, track: track, lap: lap, time: now, last: values, kind: 0, until: 0};
    return 0;
}
// Same-frame priority matches the car: TC1 > ABS > BBal.
for (var k = 0; k < values.length; k++) {
    if (values[k] !== null && s.last[k] !== null && values[k] !== s.last[k]) {
        s.kind = k + 1;
        s.until = now + HOLD_MS;
    }
}
s.last = values;
s.time = now;
s.lap = lap;
if (s.kind && (now >= s.until || values[s.kind - 1] === null)) s.kind = 0;
return s.kind;
