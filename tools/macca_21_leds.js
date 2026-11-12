/* SimHub ScriptedContent formula, ES5.
   Confirmed hardware order (1-based): side A 1..3, RPM 4..18, side B 19..21.
   The middle strip preserves the supplied RSS car's 10-segment RPM rules.
   Side alerts are additional behavior for this 3+15+3 hardware layout. */
var CONFIG = {
    pitLimitFallbackKmh: 80,
    greenBurstMs: 5000,
    assistHoldMs: 150,
    // Optional full property names from a data bridge, if native signals are absent.
    extraProperties: { ABSActive: '', TCActive: '', Flag_Green: '', Flag_Red: '' }
};
var COLOR = {
    off: '#000000', red: '#FF0000', green: '#00FF00', yellow: '#E6FF00',
    blue: '#0023FF', cyan: '#40CFFF', white: '#FFFFFF',
    purple: '#CC00FF', amber: '#FF8000'
};
var out = [], cache = {}, i;
for (i = 0; i < 21; i++) out[i] = COLOR.off;
function P(name) {
    if (Object.prototype.hasOwnProperty.call(cache, name)) return cache[name];
    var v = null;
    try { v = $prop(name); } catch (e) {}
    cache[name] = v === undefined ? null : v;
    return cache[name];
}
function first(names) {
    for (var k = 0; k < names.length; k++) {
        var v = P(names[k]);
        if (v !== null && String(v) !== '') return v;
    }
    return null;
}
function number(names) {
    for (var k = 0; k < names.length; k++) {
        var v = P(names[k]);
        if (v === null || String(v) === '') continue;
        v = Number(v);
        if (isFinite(v)) return v;
    }
    return null;
}
function truth(v) {
    if (v === true) return true;
    if (v === null || v === undefined || v === false) return false;
    if (typeof v === 'number') return v > 0;
    var s = String(v).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}
function state(name) {
    var v = first(['DataCorePlugin.GameData.NewData.' + name, name]);
    var extra = CONFIG.extraProperties[name];
    return truth(v) || (extra ? truth(P(extra)) : false);
}
function normalNumber(name) { return number(['DataCorePlugin.GameData.NewData.' + name, name]); }
var gameRunning = first(['GameRunning', 'DataCorePlugin.GameRunning']);
if (!truth(gameRunning)) { root.macca21 = null; return out; }
var carId = first(['CarId', 'DataCorePlugin.GameData.CarId', 'DataCorePlugin.GameData.NewData.CarId']);
if (carId !== null && String(carId) !== '' && String(carId).toLowerCase().indexOf('rss_gtm_macca_72_evo_v8') < 0) {
    root.macca21 = null;
    return out;
}
var now = Date.now(), s = root.macca21;
if (!s || s.version !== 1 || now < s.lastMs) {
    s = {version:1, lastMs:now, previousGreen:false, greenSince:null, absUntil:0, tcUntil:0};
    root.macca21 = s;
}
s.lastMs = now;
var gearValue = first(['DataCorePlugin.GameData.NewData.Gear', 'Gear']);
var gearText = gearValue === null ? 'N' : String(gearValue).toUpperCase();
var gear = gearText === 'R' ? -1 : (parseInt(gearText, 10) || 0);
var rpm = normalNumber('Rpms') || 0, speed = normalNumber('SpeedKmh') || 0;
var limit = number(['DataCorePlugin.GameData.NewData.PitSpeedLimit', 'PitSpeedLimit']);
if (limit === null || limit <= 0) limit = CONFIG.pitLimitFallbackKmh;
var pit = state('PitLimiterOn') || state('IsInPitLane');

function originalRpm(rpmValue, gearValue, pitValue, speedValue, limitValue) {
    var table = [
        [6550,6550,6750,6750,6950,6950,7150,7150,7350,7550],
        [6300,6300,6550,6550,6800,6800,7050,7050,7300,7550],
        [6550,6550,6750,6750,6950,6950,7150,7150,7350,7550],
        [6800,6800,6950,6950,7100,7100,7250,7250,7400,7500],
        [7000,7000,7100,7100,7200,7200,7300,7300,7400,7500],
        [7300,7300,7340,7340,7380,7380,7420,7420,7460,7500]
    ];
    var on = [35,35,20,20,5,5,20,20,35,35], off = [20,20,5,5,0,0,5,5,20,20];
    var leds = [], g = Math.abs(gearValue), delta = speedValue - limitValue;
    for (var k = 0; k < 10; k++) {
        leds[k] = COLOR.off;
        if (g < 6 && rpmValue < 7850) {
            if (rpmValue > table[g][9]) {
                var mirror = k < 5 ? k : 9-k;
                leds[k] = mirror % 2 === 0 ? COLOR.red : COLOR.blue;
            } else if (rpmValue > table[g][8]) leds[k] = COLOR.blue;
            else if (rpmValue > table[g][k]) leds[k] = k < 2 ? COLOR.green : (k < 6 ? COLOR.yellow : COLOR.red);
        }
        if (pitValue && speedValue < limitValue + 35) {
            leds[k] = COLOR.off;
            if (speedValue < limitValue) leds[k] = COLOR.green;
            else if (delta < on[k] && delta > off[k]) leds[k] = delta < 5 ? COLOR.yellow : COLOR.red;
        }
    }
    return leds;
}
var logical = originalRpm(rpm, gear, pit, speed, limit);
for (i = 0; i < 15; i++) out[3+i] = logical[Math.round(i*9/14)];
function phase(halfPeriodMs) { return Math.floor(now / halfPeriodMs) % 2 === 0; }
function sides(a, b) {
    for (var k = 0; k < 3; k++) { out[k] = a; out[18+k] = b === undefined ? a : b; }
}
function blink(color, halfPeriodMs) { sides(phase(halfPeriodMs) ? color : COLOR.off); }

// Only an actual supplied green flag starts a five-second burst.
var green = state('Flag_Green');
if (green && !s.previousGreen) s.greenSince = now;
s.previousGreen = green;
if (state('ABSActive')) s.absUntil = now + CONFIG.assistHoldMs;
if (state('TCActive')) s.tcUntil = now + CONFIG.assistHoldMs;

// Side-alert priority, highest first. Middle RPM strip is not overwritten here.
if (state('Flag_Red')) blink(COLOR.red, 250);
else if (state('Flag_Black')) sides(phase(250) ? COLOR.red : COLOR.purple);
else if (state('Flag_Yellow')) blink(COLOR.yellow, 250);
else if (state('Flag_Checkered')) {
    for (i = 0; i < 3; i++) {
        var white = (i + Math.floor(now/250)) % 2 === 0;
        out[i] = out[20-i] = white ? COLOR.white : COLOR.off;
    }
} else if (state('Flag_Blue')) blink(COLOR.blue, 200);
else if (state('Flag_White')) blink(COLOR.white, 500);
else if (pit) {
    if (speed > limit) sides(phase(500) ? COLOR.cyan : COLOR.red);
    else blink(COLOR.cyan, 500);
} else if (s.greenSince !== null && now - s.greenSince < CONFIG.greenBurstMs) blink(COLOR.green, 250);
else {
    // Outer lamps: ABS intervention. Middle lamps: TC intervention.
    var abs = now < s.absUntil, tc = now < s.tcUntil;
    if (abs) out[0] = out[2] = out[18] = out[20] = COLOR.amber;
    if (tc) out[1] = out[19] = COLOR.purple;
    if (!abs && !tc) {
        var fuel = normalNumber('Fuel');
        var perLap = number(['DataCorePlugin.Computed.Fuel_LitersPerLap']);
        if (fuel !== null && (fuel < 5 || (perLap !== null && perLap > 0 && fuel < perLap*1.2))) {
            out[1] = out[19] = phase(500) ? COLOR.amber : COLOR.off;
        }
    }
}
return out;
