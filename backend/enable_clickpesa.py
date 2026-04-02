import sys
sys.path.append('.')
from database import SessionLocal
import models

db = SessionLocal()
restaurants = db.query(models.Restaurant).all()
count = 0
for r in restaurants:
    r.clickpesa_enabled = True
    if not r.clickpesa_mobile_number:
        r.clickpesa_mobile_number = '255754000000'
    count += 1
db.commit()
print(f'Successfully enabled ClickPesa for {count} restaurants.')
