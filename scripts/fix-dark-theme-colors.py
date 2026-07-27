"""Replace hardcoded slate/gray colors with semantic tokens for dark mode support."""
import re, glob, os

REPLACEMENTS = [
    # Text colors
    ('text-slate-900', 'text-foreground'),
    ('text-slate-800', 'text-foreground'),
    ('text-slate-700', 'text-foreground'),
    ('text-slate-600', 'text-muted-foreground'),
    ('text-slate-500', 'text-muted-foreground'),
    ('text-slate-400', 'text-muted-foreground'),
    ('text-slate-300', 'text-muted-foreground'),
    ('text-slate-200', 'text-muted-foreground'),
    ('text-gray-900', 'text-foreground'),
    ('text-gray-600', 'text-muted-foreground'),
    ('text-gray-500', 'text-muted-foreground'),
    ('text-gray-400', 'text-muted-foreground'),
    # Background colors
    ('bg-slate-50', 'bg-muted'),
    ('bg-slate-100', 'bg-muted'),
    ('bg-gray-50', 'bg-muted'),
    ('bg-gray-100', 'bg-muted'),
    # Progress bar backgrounds
    ('bg-slate-200', 'bg-muted-foreground/20'),
]

files = glob.glob('src/components/dashboard/*.tsx')
for f in files:
    with open(f, 'r') as fh:
        content = fh.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    if content != original:
        with open(f, 'w') as fh:
            fh.write(content)
        count = sum(1 for o, n in REPLACEMENTS if o in original)
        print(f'  Updated {os.path.basename(f)}: {count} replacements')

print('Done!')
