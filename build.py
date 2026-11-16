from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'preview.html').read_text()
for marker,names in [('miko-sync-source',['qrcode.js','sync-core.js','sync-ui.js']),('miko-material-renderer',['material-renderer.js'])]:
    scripts='\n'.join((root/name).read_text() for name in names)
    html,count=re.subn(r'<script id="'+marker+r'">.*?</script>',lambda _: '<script id="'+marker+'">'+scripts+'</script>',html,flags=re.S)
    assert count==1, 'Source marker missing: '+marker
(root/'preview.html').write_text(html)
print('Updated paired preview:',len(html.encode()),'bytes')
