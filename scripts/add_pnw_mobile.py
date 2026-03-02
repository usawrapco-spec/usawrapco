path = r'C:\Users\wallc\Desktop\usawrapco\components\layout\MobileNav.tsx'

with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

if "href: '/pnw'" in src:
    print("Already present — no change.")
else:
    old = "    label: 'Marine / Fishing',\n    items: ["
    new = (
        "    label: 'Marine / Fishing',\n"
        "    items: [\n"
        "      { href: '/pnw',               label: 'PNW Nav',    icon: Navigation },"
    )
    src = src.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print("Done: /pnw added to Marine / Fishing section in More sheet.")
