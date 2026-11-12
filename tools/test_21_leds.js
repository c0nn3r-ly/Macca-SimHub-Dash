const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const profile=JSON.parse(fs.readFileSync(path.join(root,'leds/Macca 72 EVO - 21 LEDs.ledsprofile')));
const code=profile.LedContainers[0].ContentFormula.Expression;
const legacy=fs.readFileSync(path.join(root,'tools/fixtures/rpm_reference.formula.js'),'utf8');
let checks=0;function eq(a,b,label){assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);checks++;}
const OFF='#000000',GREEN='#00FF00',CYAN='#40CFFF',RED='#FF0000',YELLOW='#E6FF00',BLUE='#0023FF',PURPLE='#CC00FF',AMBER='#FF8000',WHITE='#FFFFFF';
const defaults={GameRunning:true,CarId:'rss_gtm_macca_72_evo_v8',Gear:'3',Rpms:7101,SpeedKmh:180,Fuel:40};
function runner(source=code,strict=false){
 const env={props:{},now:0,reads:0,root:{}};
 const ctx=vm.createContext({root:env.root,Date:{now:()=>env.now},$prop:n=>{env.reads++;if(Object.hasOwn(env.props,n))return env.props[n];if(strict)throw new Error('Unknown property');return null;}});
 const script=new vm.Script('(function(){'+source+'\n})()');
 return {env,run:(props={},now=0)=>{env.props={...defaults,...props};env.now=now;env.reads=0;const result=Array.from(script.runInContext(ctx,{timeout:1000}));eq(result.length,source===legacy?15:21,'length');assert(result.every(x=>/^#[0-9a-f]{6}$/i.test(x)));checks++;return result;}};
}
function sides(v){return v.slice(0,3).concat(v.slice(18));}
function main(v){return v.slice(3,18);}
// Every original gear/RPM threshold and pit boundary retains exactly the 15-LED legacy strip.
const thresholds=[0,6300,6550,6750,6800,6950,7000,7050,7100,7150,7200,7250,7300,7340,7350,7380,7400,7420,7460,7500,7550,7850];
const rpmPoints=new Set(thresholds.flatMap(x=>[Math.max(0,x-1),x,x+1]));
const modern=runner(),old=runner(legacy);
for(const gear of ['R','N','1','2','3','4','5','6'])for(const rpm of rpmPoints){
 const p={Gear:gear,Rpms:rpm};eq(main(modern.run(p)),old.run(p),'RPM replica '+gear+'/'+rpm);
}
for(const gear of ['1','3','6'])for(const speed of [0,79.99,80,80.01,84.99,85,85.01,99.99,100,100.01,114.99,115,116]){
 const p={Gear:gear,SpeedKmh:speed,PitLimiterOn:true};eq(main(modern.run(p)),old.run(p),'pit replica');
}
eq(profile.LedContainers[0].LedCount,21);eq(profile.LedContainers[0].StartPosition,1);eq(profile.UseProfileBrightness,true);eq(profile.GlobalBrightness,30);
// Flags have predictable on/off phases and affect only the side groups.
for(const [flag,color,half] of [['Flag_Red',RED,250],['Flag_Yellow',YELLOW,250],['Flag_Blue',BLUE,200],['Flag_White',WHITE,500]]){
 const r=runner();eq(sides(r.run({[flag]:true},0)),Array(6).fill(color),flag+' on');eq(sides(r.run({[flag]:true},half)),Array(6).fill(OFF),flag+' off');
 eq(main(r.run({[flag]:true},0)),main(runner().run({},0)),'flag leaves center');
}
let r=runner();eq(sides(r.run({PitLimiterOn:true,SpeedKmh:60},0)),Array(6).fill(CYAN));eq(sides(r.run({PitLimiterOn:true,SpeedKmh:60},500)),Array(6).fill(OFF));
eq(sides(r.run({IsInPitLane:true,SpeedKmh:81},0)),Array(6).fill(CYAN));eq(sides(r.run({IsInPitLane:true,SpeedKmh:81},500)),Array(6).fill(RED));
eq(sides(r.run({Flag_Yellow:true,PitLimiterOn:true,SpeedKmh:60},0)),Array(6).fill(YELLOW),'yellow priority over pit');
eq(sides(r.run({Flag_Red:true,Flag_Yellow:true},0)),Array(6).fill(RED),'red priority');
eq(sides(r.run({Flag_Black:true},0)),Array(6).fill(RED));eq(sides(r.run({Flag_Black:true},250)),Array(6).fill(PURPLE));
eq(sides(r.run({Flag_Checkered:true},0)),[WHITE,OFF,WHITE,WHITE,OFF,WHITE]);eq(sides(r.run({Flag_Checkered:true},250)),[OFF,WHITE,OFF,OFF,WHITE,OFF]);
// Green is triggered by an actual rising signal, lasts five seconds even for a short event.
r=runner();eq(sides(r.run({Flag_Green:true},0)),Array(6).fill(GREEN));eq(sides(r.run({Flag_Green:true},250)),Array(6).fill(OFF));eq(sides(r.run({Flag_Green:false},500)),Array(6).fill(GREEN));eq(sides(r.run({Flag_Green:false},5000)),Array(6).fill(OFF));
r=runner();r.run({Flag_Green:true},0);eq(sides(r.run({Flag_Green:true},6000)),Array(6).fill(OFF),'persistent green expires');r.run({Flag_Green:false},6250);eq(sides(r.run({Flag_Green:true},6500)),Array(6).fill(GREEN),'new edge restarts');
// Native ABS/TC signals, with a brief visible hold. Mode/setting values never trigger them.
r=runner();eq(sides(r.run({ABSActive:true,TCActive:true},0)),[AMBER,PURPLE,AMBER,AMBER,PURPLE,AMBER]);eq(sides(r.run({},149)),[AMBER,PURPLE,AMBER,AMBER,PURPLE,AMBER]);eq(sides(r.run({},150)),Array(6).fill(OFF));
eq(sides(r.run({ABSLevel:12,TCLevel:12},500)),Array(6).fill(OFF));
eq(sides(r.run({Fuel:4},1000)),[OFF,AMBER,OFF,OFF,AMBER,OFF]);eq(sides(r.run({Fuel:4},1500)),Array(6).fill(OFF));eq(sides(r.run({Fuel:5},2000)),Array(6).fill(OFF));eq(sides(r.run({Fuel:5,'DataCorePlugin.Computed.Fuel_LitersPerLap':5},2000)),[OFF,AMBER,OFF,OFF,AMBER,OFF]);
// Full names, string booleans/numbers, missing props, property exceptions, wrong car and game exit.
r=runner();eq(sides(r.run({'DataCorePlugin.GameData.NewData.Flag_Yellow':'True'},0)),Array(6).fill(YELLOW));eq(main(r.run({'DataCorePlugin.GameData.NewData.Gear':'1','DataCorePlugin.GameData.NewData.Rpms':'6301'},0)),old.run({Gear:'1',Rpms:6301},0));
eq(r.run({GameRunning:false,Flag_Yellow:true},0),Array(21).fill(OFF));eq(r.run({CarId:'other_car',Flag_Yellow:true},0),Array(21).fill(OFF));
r=runner(code,true);eq(sides(r.run({Flag_Yellow:true},0)),Array(6).fill(YELLOW));
r=runner();r.run({Flag_Green:true},0);r.run({GameRunning:false},100);eq(sides(r.run({Flag_Green:false},500)),Array(6).fill(OFF),'game exit clears green');
const withExtra=code.replace("ABSActive: ''","ABSActive: 'ExampleBridge.ABSInAction'");eq(sides(runner(withExtra).run({'ExampleBridge.ABSInAction':true},0)),[AMBER,OFF,AMBER,AMBER,OFF,AMBER]);
const calibration=JSON.parse(fs.readFileSync(path.join(root,'leds/MagicDash 4 - 21 LED order test.ledsprofile')));eq(calibration.LedContainers[0].LedCount,21);
const calCode=calibration.LedContainers[0].ContentFormula.Expression;
for(let i=0;i<21;i++){
 const v=Array.from(vm.runInNewContext('(function(){'+calCode+'})()',{Date:{now:()=>i*700}}));eq(v,Array.from({length:21},(_,n)=>n===i?WHITE:OFF),'calibration '+i);
}
console.log('PASS: '+checks+' checks; center strip matches original, side priorities, blinking, green burst, assists, full/alias telemetry, cleanup and 21-position calibration.');
// A visual demo is generated from the same actual output, never from handwritten colors.
const scenes=[];
for(const [label,props] of [['RPM ONLY',{Gear:'1',Rpms:7101}],['PIT / CYAN',{PitLimiterOn:true,SpeedKmh:60}],['YELLOW FLAG',{Flag_Yellow:true}],['GREEN / 5 SEC',{Flag_Green:true}],['BLUE FLAG',{Flag_Blue:true}],['ABS + TC',{ABSActive:true,TCActive:true}]]){
 const rr=runner();for(let frame=0;frame<8;frame++)scenes.push({label,colors:rr.run(props,frame*250)});
}
fs.writeFileSync('/private/tmp/macca-21-led-demo.json',JSON.stringify(scenes));
