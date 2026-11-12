#!/usr/bin/env python3
"""Add the original BBal/ABS/TC1 setting overlays to a Macca dashboard.

Requires Pillow. Existing screens/items/resources remain intact.
"""
from pathlib import Path
import argparse, copy, hashlib, io, json, uuid, zipfile
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
NS = 'SimHub.Plugins.OutputPlugins.GraphicalDash.Models.'
SETTINGS = [(1, 'BBal', (65, 105, 225), 'BrakeBias'),
            (2, 'ABS', (178, 34, 34), 'ABSLevel'),
            (3, 'TC1', (184, 31, 11), 'TCLevel')]

def ident(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'macca-simhub-dash/' + name))

def ncalc(expr, fmt=None):
    result = {'Formula': {'Expression': expr}, 'Mode': 2}
    if fmt is not None:
        result['FormatString'] = fmt
    return result

def base(kind, name, x, y, w, h, visible):
    return {'$type': NS + kind + ', SimHub.Plugins', 'Name': name,
            'Id': ident(name), 'Left': x, 'Top': y, 'Width': w, 'Height': h,
            'Visible': False, 'Opacity': 100, 'BackgroundColor': '#00000000',
            'RenderingSkip': 0, 'MinimumRefreshIntervalMS': 0,
            'Bindings': {'Visible': ncalc(visible)}}

def patch(src, dest):
    with zipfile.ZipFile(src) as z:
        entries = {n: z.read(n) for n in z.namelist()}
    stem = src.stem
    basekey = stem + '/' + stem + '.djson'
    d = json.loads(entries[basekey])
    before = copy.deepcopy(d)
    assert not any(v['VariableName'] == 'MaccaSettingPopup' for v in d['Variables']['DashboardVariables'])
    code = (ROOT / 'tools/setting_popups.js').read_text()
    d['Variables']['DashboardVariables'].append({
        'VariableName': 'MaccaSettingPopup', 'EvaluateOnlyOnce': False,
        'OverrideWithParentDashboardVariableWhenAvailable': False,
        'ValueExpression': {'Interpreter': 1, 'JSExt': 0, 'Expression': code},
        'EvaluateBeforeScreenRoles': True})
    with zipfile.ZipFile(io.BytesIO(entries[basekey + '.ressources'])) as z:
        resources = {n: z.read(n) for n in z.namelist()}
    gradient = Image.open(ROOT / 'tools/assets/PopUp.png').convert('RGBA')
    for index, label, rgb, prop in SETTINGS:
        asset = 'SettingPopup' + label
        # Matches CSP drawImage texture tint; alpha is preserved.
        tint = Image.new('RGB', gradient.size, rgb)
        image = ImageChops.multiply(gradient.convert('RGB'), tint).convert('RGBA')
        image.putalpha(gradient.getchannel('A'))
        buf = io.BytesIO(); image.save(buf, format='PNG'); data = buf.getvalue()
        resources[asset + '.png'] = data
        d['Images'].append({'Name': asset, 'Extension': '.png', 'Modified': False,
                            'Optimized': False, 'Width': image.width, 'Height': image.height,
                            'Length': len(data), 'MD5': hashlib.md5(data).hexdigest()})
        for screen in d['Screens']:
            if screen['Name'] not in ('RACE', 'PIT'):
                continue
            name = screen['Name'] + ' setting popup ' + label
            visible = '[variable.MaccaSettingPopup] = ' + str(index)
            bg = base('ImageItem', name + ' background', 231, 120, 338, 107, visible)
            bg.update(Image=asset, AutoSize=False, AutoSizeScale=1)
            screen['Items'].append(bg)
            for suffix, y, height, size, sample in [('title', 120, 53, 39, label),
                                                     ('value', 173, 54, 41, '--')]:
                text = base('TextItem', name + ' ' + suffix, 231, y, 338, height, visible)
                text.update(IsTextItem=True, Font='Macca RSS Display', FontWeight='Normal',
                            FontStyle='Normal', FontSize=size, Text=sample, TextColor='#FFF1F1F1',
                            HorizontalAlignment=1, VerticalAlignment=1, TextWrapping='NoWrap')
                if suffix == 'value':
                    if prop == 'BrakeBias':
                        # Same normalization/precision as the existing pit display.
                        expression = "function num(){var names=['DataCorePlugin.GameData.NewData.BrakeBias','BrakeBias'];for(var i=0;i<names.length;i++){try{var v=$prop(names[i]);if(v!==null&&v!==undefined&&String(v)!==''&&isFinite(Number(v)))return Number(v);}catch(e){}}return null;}var v=num();return v===null?'--':(v<=1?v*100:v).toFixed(1);"
                        text['Bindings']['Text'] = {'Formula': {'Interpreter': 1, 'JSExt': 0, 'Expression': expression}, 'Mode': 2}
                    else:
                        text['Bindings']['Text'] = ncalc("isnull([" + prop + "], '--')", '0')
                screen['Items'].append(text)
    # Protect all existing items, variables and image entries, including fast fields.
    for old, new in zip(before['Screens'], d['Screens']):
        assert new['Items'][:len(old['Items'])] == old['Items']
        assert len(new['Items']) == len(old['Items']) + (9 if old['Name'] in ('RACE', 'PIT') else 0)
    assert d['Variables']['DashboardVariables'][:-1] == before['Variables']['DashboardVariables']
    d['Id'] = ident(dest.stem)
    d['Metadata'].update(Title=dest.stem, DashboardVersion='0.3.3',
                         Description='Original-style 2-second BBal, ABS and TC1 setting popups on race and pit pages; fast RPM, speed and predicted lap refresh retained.')
    entries[basekey] = json.dumps(d, indent=2, ensure_ascii=False).encode()
    entries[basekey + '.metadata'] = json.dumps(d['Metadata'], indent=2, ensure_ascii=False).encode()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in resources.items():
            z.writestr(name, data)
    entries[basekey + '.ressources'] = buf.getvalue()
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in entries.items():
            z.writestr(name.replace(stem, dest.stem), data)
    return d

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    patch(args.input, args.output)
    print('Packaged', args.output)
