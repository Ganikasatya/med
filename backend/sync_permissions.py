"""One-off: re-sync role_permissions in the DB to match rbac.py.

The seeder no-ops once roles exist, so changes to the permission matrix in
rbac.py don't reach an already-seeded database. This adds any missing
(role -> permission) grants for every role. Idempotent: safe to run repeatedly.

Run:  python sync_permissions.py
"""
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Permission, Role, RolePermission
from app.rbac import permissions_for


def main() -> None:
    db = SessionLocal()
    try:
        perms = {(p.module, p.action): p for p in db.scalars(select(Permission)).all()}
        existing = {
            (rp.role_id, rp.permission_id)
            for rp in db.scalars(select(RolePermission)).all()
        }
        added = 0
        for role in db.scalars(select(Role)).all():
            for key in permissions_for(role.name):
                perm = perms.get(key)
                if not perm:
                    print(f"  ! permission {key} not in catalog — skipped")
                    continue
                if (role.role_id, perm.permission_id) not in existing:
                    db.add(RolePermission(role_id=role.role_id, permission_id=perm.permission_id))
                    added += 1
                    print(f"  + {role.name}: {key[0]}.{key[1]}")
        db.commit()
        print(f"\nDone. {added} grant(s) added.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
