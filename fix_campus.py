import re

# 1. Fix borrowing.js — remove university match check
path = r'd:/Campus Share/campusshare/server/src/services/borrowing.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
old = "ensure(owner.status==='ACTIVE'&&owner.university===user.university,403,'Choose an item from your campus');"
new = "ensure(owner.status==='ACTIVE',403,'This owner account is not active.');"
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('borrowing.js: university check removed')

# 2. Fix itemController.js — remove university filter from list query
path2 = r'd:/Campus Share/campusshare/server/src/controllers/itemController.js'
with open(path2, 'r', encoding='utf-8') as f:
    c2 = f.read()
c2 = c2.replace("if(req.user){where.push('u.university=?');args.push(req.user.university)}", "")
with open(path2, 'w', encoding='utf-8') as f:
    f.write(c2)
print('itemController.js: university filter removed')

# 3. Fix Marketplace.jsx — replace campus zone options with BML areas
path3 = r'd:/Campus Share/campusshare/client/src/pages/Marketplace.jsx'
with open(path3, 'r', encoding='utf-8') as f:
    c3 = f.read()
c3 = c3.replace(
    "['North Campus','South Campus','Hostel Zone']",
    "['Academic Block','Hostels','Sports Complex','Library']"
)
with open(path3, 'w', encoding='utf-8') as f:
    f.write(c3)
print('Marketplace.jsx: campus zones updated')

# 4. Fix ListingForm.jsx — update default location
path4 = r'd:/Campus Share/campusshare/client/src/pages/ListingForm.jsx'
with open(path4, 'r', encoding='utf-8') as f:
    c4 = f.read()
c4 = c4.replace("location:'North Campus'", "location:'Academic Block'")
with open(path4, 'w', encoding='utf-8') as f:
    f.write(c4)
print('ListingForm.jsx: default location updated')

# 5. Fix database setup.js — update university seed data
path5 = r'd:/Campus Share/campusshare/server/database/setup.js'
with open(path5, 'r', encoding='utf-8') as f:
    c5 = f.read()
c5 = c5.replace("'Delhi Technological University'", "'BML Munjal University'")
c5 = c5.replace("['North Campus','South Campus','Hostel Zone'][i%3]", "'BML Munjal Campus'")
with open(path5, 'w', encoding='utf-8') as f:
    f.write(c5)
print('setup.js: seed university updated')

print('\nAll fixes applied successfully!')
