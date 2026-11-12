#!/usr/bin/env python3
"""Package the single 21-LED formula and a telemetry-independent order test."""
from pathlib import Path
import json,uuid
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'leds'
def ident(name):return str(uuid.uuid5(uuid.NAMESPACE_URL,'macca-simhub-dash/'+name))
def profile(name,expression,description):
 return {'CarChoices':[],'UseStrictJSIsolation':True,'GlobalBrightness':30.0,'GlobalBrightnessPreset':{'CurrentMode':0,'Brightness':30.0,'BrightnessSettings':{}},'UseProfileBrightness':True,'LedContainers':[{'ContentFormula':{'JSExt':0,'Interpreter':1,'Expression':expression},'LedCount':21,'StartPosition':1,'ContainerType':'ScriptedContent','Description':description}],'Name':name,'ProfileId':ident(name),'GameCode':None,'CarChoice':None}
script=(ROOT/'tools/macca_21_leds.js').read_text()
p=profile('Macca 72 EVO - 21 LEDs v1.0',script,'1-3 side A; 4-18 original RSS RPM mapped to 15; 19-21 side B. Flags, pit, green burst, ABS/TC and low fuel.')
(OUT/'Macca 72 EVO - 21 LEDs.ledsprofile').write_text(json.dumps(p,indent=2)+'\n')
order="var a=[];var n=Math.floor(Date.now()/700)%21;for(var i=0;i<21;i++)a[i]=i===n?'#FFFFFF':'#000000';return a;"
p=profile('MagicDash 4 - 21 LED order test',order,'White LED: side A 1-3, top 4-18, side B 19-21, 700 ms per step. No game needed.')
(OUT/'MagicDash 4 - 21 LED order test.ledsprofile').write_text(json.dumps(p,indent=2)+'\n')
print('Built 21-LED main and order-test profiles at 30% profile brightness.')
