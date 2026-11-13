from pathlib import Path
import re
root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text()
scripts = '\n'.join((root / name).read_text() for name in ['qrcode.js', 'sync-core.js', 'sync-ui.js'])
html, count = re.subn(r'<script id="miko-sync-source">.*?</script>', lambda _: '<script id="miko-sync-source">'+scripts+'</script>', html, flags=re.S)
assert count == 1, 'Sync source marker missing'
(root / 'index.html').write_text(html)
print('Updated embedded sync source:', len(html.encode()), 'bytes')
