#!/usr/bin/env python3
"""Exercise generated color formulas with Node; does not claim a Windows/Jint hardware test."""
import json,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
cases=[]
for p in sorted((ROOT/'dashboards').glob('*v0.3.1.simhubdash')):
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  d=json.loads(z.read(p.stem+'/'+p.stem+'.djson'))
  assert all(v['VariableName']!='MaccaTyreState' for v in d['Variables']['DashboardVariables'])
  race=next(s for s in d['Screens'] if s['Name']=='RACE')
  for corner,suffix in [('FL','FrontLeft'),('FR','FrontRight'),('RL','RearLeft'),('RR','RearRight')]:
   block=next(i for i in race['Items'] if i['Name']=='Tyre '+corner)['Bindings']['BackgroundColor']['Formula']['Expression']
   temp=next(i for i in race['Items'] if i['Name']=='Temperature '+corner)['Bindings']['TextColor']['Formula']['Expression']
   pressure=next(i for i in race['Items'] if i['Name']=='Pressure '+corner)['Bindings']['TextColor']['Formula']['Expression']
   for code in [block,temp,pressure]:
    assert not any(s in code for s in ['MaccaTyreState','GameRunning','root.','Date.now'])
   for compound,optimum in [('Dry',90),('Wet',45)]:
    for prefix in ['','DataCorePlugin.GameData.NewData.']:
     for delta,color in [(-100,'#FF003CFF'),(-15,'#FF003CFF'),(-5,'#FF1EC800'),(0,'#FF1EC800'),(5,'#FF1EC800'),(15,'#FFFF8200'),(25,'#FFFF2814'),(100,'#FFFF2814')]:
      props={prefix+'TyreTemperature'+suffix:optimum+delta,'GameRawData.Graphics.TyreCompound':compound}
      cases.append([p.name+'/'+corner+'/gradient',block,props,color,False])
     for delta,color in [(-16,'#FF1E50E1'),(-15,'#FFF1F1F1'),(0,'#FFF1F1F1'),(15,'#FFF1F1F1'),(16,'#FFFF0000')]:cases.append([corner+'/temperature',temp,{prefix+'TyreTemperature'+suffix:optimum+delta,'GameRawData.Graphics.TyreCompound':compound},color,False])
     for delta,color in [(-1.6,'#FF1E50E1'),(-1.5,'#FFF1F1F1'),(0,'#FFF1F1F1'),(1.5,'#FFF1F1F1'),(1.6,'#FFFF0000')]:cases.append([corner+'/pressure',pressure,{prefix+'TyrePressure'+suffix:27+delta},color,False])
   cases.extend([
    [corner+'/missing',block,{},'#FF808080',False],
    [corner+'/missing-pressure',pressure,{},'#FF808080',False],
    [corner+'/unknown-full-property-throws',block,{'TyreTemperature'+suffix:90},'#FF1EC800',True],
    [corner+'/invalid-full-property-fallback',block,{'TyreTemperature'+suffix:90,'DataCorePlugin.GameData.NewData.TyreTemperature'+suffix:'--'},'#FF1EC800',False],
    [corner+'/numeric-string',block,{'TyreTemperature'+suffix:'90'},'#FF1EC800',False],
   ])
script=r'''
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const cases=JSON.parse(fs.readFileSync(0,'utf8'));
for(const [name,code,props,expect,throwUnknown] of cases){
 const actual=vm.runInNewContext('(function(){'+code+'\n})()',{$prop:n=>{if(Object.hasOwn(props,n))return props[n];if(throwUnknown)throw new Error('Unknown property');return null;}},{timeout:1000});
 assert.equal(actual,expect,name);
}
console.log('PASS: '+cases.length+' generated binding cases (four corners, full/alias names, missing data, dry/wet, exact thresholds).');
'''
r=subprocess.run(['node','-e',script],input=json.dumps(cases),text=True,capture_output=True)
print(r.stdout,end='')
if r.returncode:print(r.stderr);raise SystemExit(r.returncode)
