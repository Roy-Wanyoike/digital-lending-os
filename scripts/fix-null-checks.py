#!/usr/bin/env python3
"""Add null check after getApiUser() calls that are missing one."""

import re, os, sys

API_DIR = '/home/z/my-project/src/app/api'
SKIP_DIRS = {'wallets'}  # wallet routes already have their own auth pattern

def process_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    changed = False
    # Check if file imports errorResponse
    has_error_response = any('errorResponse' in line for line in lines)
    # Check if file imports NextResponse
    has_next_response = any('NextResponse' in line for line in lines)
    
    # Determine the return pattern to use
    if has_error_response:
        return_line = "    if (!user) return errorResponse('Authentication required', 401)\n"
    elif has_next_response:
        return_line = "    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })\n"
    else:
        # Add the import and use NextResponse
        return_line = "    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })\n"
    
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        new_lines.append(line)
        
        # Check if this line has getApiUser
        if 'await getApiUser(' in line and 'const user' in line:
            # Look ahead for null check (within next 3 non-empty lines)
            has_null_check = False
            for j in range(i + 1, min(i + 4, len(lines))):
                stripped = lines[j].strip()
                if not stripped:
                    continue
                if '!user' in stripped or 'requireAuth' in stripped or 'requireRole' in stripped or 'requireAdmin' in stripped:
                    has_null_check = True
                break
            
            if not has_null_check:
                new_lines.append(return_line)
                changed = True
        
        i += 1
    
    if changed:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        print(f'FIXED: {filepath}')
    else:
        print(f'OK: {filepath}')

def main():
    # Find all route.ts files excluding wallets
    for root, dirs, files in os.walk(API_DIR):
        # Skip wallet routes
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for fname in files:
            if fname == 'route.ts':
                filepath = os.path.join(root, fname)
                # Only process files that have getApiUser
                with open(filepath, 'r') as f:
                    content = f.read()
                if 'getApiUser' in content:
                    process_file(filepath)

if __name__ == '__main__':
    main()
