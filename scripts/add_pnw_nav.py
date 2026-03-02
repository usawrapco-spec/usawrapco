import re

path = r'C:\Users\wallc\Desktop\usawrapco\components\layout\SideNav.tsx'

with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# Add PNW Navigator entry to the ADVANCED section, after Fleet Map
old = "      { href: '/fleet-map',   label: 'Fleet',        icon: Map },"
new = "      { href: '/fleet-map',   label: 'Fleet',        icon: Map },\n      { href: '/pnw',         label: 'PNW Navigator', icon: Navigation },"

if "'/pnw'" in src:
    print("PNW Navigator link already exists — no change needed.")
else:
    src = src.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print("Done: PNW Navigator added to ADVANCED section.")
