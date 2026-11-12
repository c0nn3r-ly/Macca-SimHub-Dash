// Offline ES5 controller tests; no claim of Windows/Jint/device validation.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const code = fs.readFileSync(__dirname + '/setting_popups.js', 'utf8');
let count = 0;
function harness(full = false, throws = false) {
    const props = {GameRunning: true}, root = {};
    let time = 10000;
    const prefix = full ? 'DataCorePlugin.GameData.NewData.' : '';
    function set(values) { for (const [key, value] of Object.entries(values)) props[prefix + key] = value; }
    set({CarId: 'rss_gtm_macca_72_evo_v8', TrackCode: 'test', CompletedLaps: 0, BrakeBias: 0.55, ABSLevel: 3, TCLevel: 4});
    const context = vm.createContext({root, Date: {now: () => time}, $prop: name => {
        if (Object.hasOwn(props, name)) return props[name];
        if (throws) throw Error('Unknown property');
        return null;
    }});
    const script = new vm.Script('(function(){' + code + '\n})()');
    return {
        props, set,
        check(expected, after = 0) { time += after; assert.equal(script.runInContext(context, {timeout: 1000}), expected); count++; },
        running(value) { props.GameRunning = value; },
    };
}
for (const full of [false, true]) for (const throws of [false, true]) {
    const h = harness(full, throws);
    h.check(0); h.check(0, 100); // Initial data never opens a popup.
    h.set({BrakeBias: 0.552}); h.check(1);
    h.check(1, 1999); h.check(0, 1); // Exactly 2 seconds.
    h.set({ABSLevel: 4}); h.check(2);
    h.set({ABSLevel: 5}); h.check(2, 1500);
    h.check(2, 1500); h.check(0, 500); // Repeated adjustment restarts hold.
    h.set({TCLevel: 6}); h.check(3);
    h.set({BrakeBias: 0.56}); h.check(1, 50); // Latest changed setting wins.
    h.set({BrakeBias: 0.57, ABSLevel: 6, TCLevel: 7}); h.check(3);
    h.set({TCLevel: null}); h.check(0); // Dropout hides, not TC=0.
    h.set({TCLevel: 9}); h.check(0); // Recovery establishes a new baseline.
    h.set({TCLevel: 0}); h.check(3); // Zero is a real setting.
    h.running(false); h.check(0);
    h.running(true); h.check(0);
    h.set({ABSLevel: 0}); h.check(2);
    h.set({CarId: 'another-car'}); h.check(0);
    h.set({ABSLevel: 1}); h.check(2);
    h.set({TrackCode: 'another-track'}); h.check(0);
    h.set({CompletedLaps: 4}); h.check(0);
    h.set({ABSLevel: 2}); h.check(2);
    h.set({CompletedLaps: 0}); h.check(0);
    h.set({ABSLevel: 3}); h.check(2);
    h.check(0, -500); // Clock reset must not leave a stuck popup.
}
const h = harness();
h.check(0);
h.set({BrakeBias: 55}); h.check(0); // Fraction/percent forms are equivalent.
h.set({BrakeBias: 55.001}); h.check(0); // Ignore sub-display floating noise.
h.set({BrakeBias: 55.1}); h.check(1);
h.set({BrakeBias: '--'}); h.check(0);
h.set({BrakeBias: '55.2'}); h.check(0);
h.set({BrakeBias: '55.3'}); h.check(1);
h.set({ABSLevel: NaN, TCLevel: Infinity}); h.check(1);
h.props['DataCorePlugin.GameData.NewData.ABSLevel'] = '--';
h.set({ABSLevel: 4}); h.check(1); // Previously missing establishes baseline.
h.set({ABSLevel: 5}); h.check(2); // Invalid full path falls back to alias.
console.log('PASS: ' + count + ' setting popup state checks (timing, priority, restart, dropout, zero, reset, aliases, invalid values).');
