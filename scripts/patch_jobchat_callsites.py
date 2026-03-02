import re

# ─── Patch JobDetailClient.tsx ───────────────────────────────────────────────
path1 = r'C:\Users\wallc\Desktop\usawrapco\components\projects\JobDetailClient.tsx'
with open(path1, 'r', encoding='utf-8') as f:
    src1 = f.read()

old1 = '''          {tab === 'comments' && (
            <JobChat
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              currentUserName={profile.name}
            />
          )}'''

new1 = '''          {tab === 'comments' && (
            <JobChat
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              currentUserName={profile.name}
              customerName={customer?.name}
              installerName={teammates.find(t => t.id === project.installer_id)?.name}
            />
          )}'''

if old1 in src1:
    src1 = src1.replace(old1, new1, 1)
    with open(path1, 'w', encoding='utf-8') as f:
        f.write(src1)
    print('JobDetailClient.tsx: patched OK')
else:
    print('JobDetailClient.tsx: WARNING — pattern not found, checking alternate...')
    # Try to find it with regex to debug
    idx = src1.find("tab === 'comments'")
    if idx >= 0:
        print('Found comments tab at index', idx)
        print(repr(src1[idx:idx+250]))
    else:
        print('comments tab not found at all!')

# ─── Patch ProjectDetail.tsx ─────────────────────────────────────────────────
path2 = r'C:\Users\wallc\Desktop\usawrapco\components\projects\ProjectDetail.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    src2 = f.read()

old2 = '''                <JobChat projectId={project.id} orgId={project.org_id} currentUserId={profile.id} currentUserName={profile.name} />'''

new2 = '''                <JobChat
                  projectId={project.id}
                  orgId={project.org_id}
                  currentUserId={profile.id}
                  currentUserName={profile.name}
                  customerName={f.client || undefined}
                  installerName={teammates.find(t => t.id === project.installer_id)?.name || f.installer || undefined}
                />'''

if old2 in src2:
    src2 = src2.replace(old2, new2, 1)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(src2)
    print('ProjectDetail.tsx: patched OK')
else:
    print('ProjectDetail.tsx: WARNING — pattern not found, checking...')
    idx = src2.find('<JobChat projectId={project.id}')
    if idx >= 0:
        print('Found JobChat at index', idx)
        print(repr(src2[idx:idx+250]))
    else:
        print('JobChat not found in ProjectDetail.tsx!')
