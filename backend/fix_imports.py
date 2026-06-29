import os
d = 'app/routers'
for f in os.listdir(d):
    if not f.endswith('.py'): continue
    path = os.path.join(d, f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'get_current_user' in content:
        # Check if already imported
        if 'import get_current_user' not in content and 'import require_role, get_current_user' not in content:
            if 'from app.dependencias import require_role' in content:
                content = content.replace('from app.dependencias import require_role', 'from app.dependencias import require_role, get_current_user')
            else:
                # insert after from fastapi import
                if 'from fastapi import' in content:
                    content = content.replace('from fastapi import', 'from app.dependencias import get_current_user\nfrom fastapi import', 1)
                else:
                    content = 'from app.dependencias import get_current_user\n' + content
            with open(path, 'w', encoding='utf-8') as file:
                file.write(content)
