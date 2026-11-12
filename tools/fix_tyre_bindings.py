#!/usr/bin/env python3
"""Patch a Macca .simhubdash: direct telemetry colors without packed dashboard state."""
from pathlib import Path
import argparse,copy,json,uuid,zipfile
READ = '''function readValue(names){
 for(var i=0;i<names.length;i++){
  try{var v=$prop(names[i]);if(v!==null && v!==undefined && String(v)!=='')return v;}catch(e){}
 }
 return null;
}
function readNumber(names){for(var i=0;i<names.length;i++){var v=readValue([names[i]]);if(v===null)continue;v=Number(v);if(isFinite(v))return v;}return null;}
'''
TARGET = '''var compound=readValue(['DataCorePlugin.GameRawData.Graphics.TyreCompound','GameRawData.Graphics.TyreCompound','TyreCompound']);
var name=compound===null?'':String(compound).toLowerCase().replace(/^\\s+|\\s+$/g,'');
var optimum=name==='w'||name.indexOf('wet')>=0?45:90;
'''
def read_temperature(suffix):
 return "var t=readNumber(['DataCorePlugin.GameData.NewData.TyreTemperature"+suffix+"','TyreTemperature"+suffix+"']);\n"
def block_formula(suffix):
 return READ+TARGET+read_temperature(suffix)+'''if(t===null)return '#FF808080';
var x=t-optimum, points=[-15,-5,5,15,25];
var colors=[[0,60,255],[30,200,0],[30,200,0],[255,130,0],[255,40,20]];
var k=0,f=0;
if(x>=25)k=4;
else if(x>-15){while(x>points[k+1])k++;f=(x-points[k])/(points[k+1]-points[k]);}
var result='#FF';
for(var c=0;c<3;c++){
 var value=Math.round(colors[k][c]+(k<4?(colors[k+1][c]-colors[k][c])*f:0));
 var hex=value.toString(16).toUpperCase();result+=(hex.length<2?'0':'')+hex;
}
return result;'''
def temperature_formula(suffix):
 return READ+TARGET+read_temperature(suffix)+"if(t===null)return '#FF808080';return t-optimum>15?'#FFFF0000':t-optimum< -15?'#FF1E50E1':'#FFF1F1F1';"
def pressure_formula(suffix):
 return READ+"var p=readNumber(['DataCorePlugin.GameData.NewData.TyrePressure"+suffix+"','TyrePressure"+suffix+"']);\nif(p===null)return '#FF808080';return p-27>1.5?'#FFFF0000':p-27< -1.5?'#FF1E50E1':'#FFF1F1F1';"
def binding(expression):return {'Formula':{'Interpreter':1,'JSExt':0,'Expression':expression},'Mode':2}
def patch(src,dest):
 with zipfile.ZipFile(src) as z:
  contents={n:z.read(n) for n in z.namelist()}
 base=next(n for n in contents if n.replace('\\','/').endswith('/'+src.stem+'.djson'))
 oldname=src.stem;newname=dest.stem
 d=json.loads(contents[base]);before=copy.deepcopy(d)
 variables=d.get('Variables',{}).get('DashboardVariables',[])
 d['Variables']['DashboardVariables']=[v for v in variables if v['VariableName']!='MaccaTyreState']
 changes=[]
 for s in d['Screens']:
  if s['Name']!='RACE':continue
  for suffix,corner in [('FrontLeft','FL'),('FrontRight','FR'),('RearLeft','RL'),('RearRight','RR')]:
   for name,target,expr in [('Tyre '+corner,'BackgroundColor',block_formula(suffix)),('Temperature '+corner,'TextColor',temperature_formula(suffix)),('Pressure '+corner,'TextColor',pressure_formula(suffix))]:
    item=next(i for i in s['Items'] if i['Name']==name)
    item.setdefault('Bindings',{})[target]=binding(expr)
    item['RenderingSkip']=25;item['MinimumRefreshIntervalMS']=250
    changes.append(name)
 assert len(changes)==12
 d['Id']=str(uuid.uuid5(uuid.NAMESPACE_URL,'macca-simhub-dash/'+newname))
 d['Metadata'].update(Title=newname,DashboardVersion='0.3.1',Description='Tyre colors read each wheel directly through full and alias telemetry names. No packed tyre-state dashboard variable. Windows color validation pending.')
 # Guard the scope: every unrelated item and the remaining variables must be identical.
 for old_screen,new_screen in zip(before['Screens'],d['Screens']):
  for old_item,new_item in zip(old_screen['Items'],new_screen['Items']):
   if old_screen['Name']=='RACE' and new_item['Name'] in changes:
    restored=copy.deepcopy(new_item);key='BackgroundColor' if restored['Name'].startswith('Tyre ') else 'TextColor'
    restored['Bindings'][key]=old_item['Bindings'][key]
    assert restored==old_item,new_item['Name']
   else:assert new_item==old_item,new_item['Name']
 assert d['Variables']['DashboardVariables']==[v for v in before['Variables']['DashboardVariables'] if v['VariableName']!='MaccaTyreState']
 contents[base]=json.dumps(d,indent=2,ensure_ascii=False).encode()
 meta=base+'.metadata';contents[meta]=json.dumps(d['Metadata'],indent=2,ensure_ascii=False).encode()
 dest.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
  for key,data in contents.items():
   key=key.replace(oldname,newname)
   info=zipfile.ZipInfo(key,date_time=(2026,11,12,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  assert newname+'/'+newname+'.djson' in z.namelist()
 return d
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('output',type=Path);args=p.parse_args();patch(args.input,args.output);print('Patched:',args.output)
