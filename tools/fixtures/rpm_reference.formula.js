// Legacy 15-LED formula used only as a regression reference by test_21_leds.js.
var DEFAULT_PIT_LIMIT = 80;
function P(n) { try { var v = $prop(n); return v === undefined ? null : v; } catch(e) { return null; } }
function first(names) { for(var i=0;i<names.length;i++) { var v=P(names[i]); if(v!==null && v!=='') return v; } return null; }
function number(v) { if(v===null || v===undefined || v==='') return null; var n=Number(v); return isFinite(n)?n:null; }
function value(names) { return number(first(names)); }
function on(v) { return v===true || v===1 || String(v).toLowerCase()==='true' || v==='1'; }
function running() { return on(first(['GameRunning','DataCorePlugin.GameRunning'])); }
function pitActive() { return on(first(['PitLimiterOn','DataCorePlugin.GameData.NewData.PitLimiterOn'])) || on(first(['IsInPitLane','DataCorePlugin.GameData.NewData.IsInPitLane'])); }
function gearNumber() { var v=first(['Gear','DataCorePlugin.GameData.NewData.Gear']); if(v==='R')return -1; if(v==='N'||v===null)return 0; return parseInt(v,10)||0; }
function speedKmh() { return value(['SpeedKmh','DataCorePlugin.GameData.NewData.SpeedKmh'])||0; }
function pitLimit() { var n=value(['PitSpeedLimit']); return n!==null && n>0 ? n : DEFAULT_PIT_LIMIT; }
/* RSS Macca 72 EVO: behavior transcribed from the supplied Dash_led.lua and RPM_set_0.2Dlut.
   Pure ES5. Logical indices 0..9; hardware projection is kept separate.
   No blink is added to the red/blue shift pattern (the source does not blink it). */
function maccaLogicalLeds(rpm, gear, pit, speed, limit, ignition) {
    var off = '#000000', green = '#00FF00', yellow = '#E6FF00', red = '#FF0000', blue = '#0023FF';
    var table = [
        [6550,6550,6750,6750,6950,6950,7150,7150,7350,7550],
        [6300,6300,6550,6550,6800,6800,7050,7050,7300,7550],
        [6550,6550,6750,6750,6950,6950,7150,7150,7350,7550],
        [6800,6800,6950,6950,7100,7100,7250,7250,7400,7500],
        [7000,7000,7100,7100,7200,7200,7300,7300,7400,7500],
        [7300,7300,7340,7340,7380,7380,7420,7420,7460,7500]
    ];
    var onLut = [35,35,20,20,5,5,20,20,35,35];
    var offLut = [20,20,5,5,0,0,5,5,20,20];
    var out = [], g = Math.abs(gear), i, delta = speed - limit;
    for (i = 0; i < 10; i++) out[i] = off;
    if (!ignition) return out;
    for (i = 0; i < 10; i++) {
        if (g < 6 && rpm < 7850) {
            if (rpm > table[g][9]) {
                var mirror = i < 5 ? i : 9-i;
                out[i] = mirror % 2 === 0 ? red : blue;
            } else if (rpm > table[g][8]) out[i] = blue;
            else if (rpm > table[g][i]) out[i] = i < 2 ? green : i < 6 ? yellow : red;
        }
        if (pit && speed < limit + 35) {
            out[i] = off;
            if (speed < limit) out[i] = green;
            else if (delta < onLut[i] && delta > offLut[i]) out[i] = delta < 5 ? yellow : red;
        }
    }
    return out;
}
function maccaProject15(logical) {
    var out = [];
    for (var i = 0; i < 15; i++) out[i] = logical[Math.round(i * 9 / 14)];
    return out;
}

var out=[], i;for(i=0;i<15;i++)out[i]='#000000';
if(!running())return out;
var id=first(['CarId','DataCorePlugin.GameData.NewData.CarId']);
if(id!==null && String(id)!=='' && String(id).toLowerCase().indexOf('rss_gtm_macca_72_evo_v8')<0)return out;
var rpm=value(['Rpms'])||0;
var logical=maccaLogicalLeds(rpm,gearNumber(),pitActive(),speedKmh(),pitLimit(),true);
return 15===15?maccaProject15(logical):logical;
