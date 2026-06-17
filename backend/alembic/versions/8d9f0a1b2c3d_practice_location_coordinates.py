"""practice location coordinates

Revision ID: 8d9f0a1b2c3d
Revises: 2f4b7c9d1e20
Create Date: 2026-06-16 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8d9f0a1b2c3d'
down_revision: Union[str, None] = '2f4b7c9d1e20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in sa.inspect(bind).get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    with op.batch_alter_table('doctor_affiliations', schema=None) as batch_op:
        if not _has_column(bind, 'doctor_affiliations', 'latitude'):
            batch_op.add_column(sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True))
        if not _has_column(bind, 'doctor_affiliations', 'longitude'):
            batch_op.add_column(sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True))

    bind.execute(sa.text(
        """
        UPDATE doctor_affiliations da
        SET latitude = h.latitude,
            longitude = h.longitude
        FROM hospitals h
        WHERE da.hospital_id = h.hospital_id
          AND da.latitude IS NULL
          AND da.longitude IS NULL
        """
    ))


def downgrade() -> None:
    bind = op.get_bind()
    with op.batch_alter_table('doctor_affiliations', schema=None) as batch_op:
        if _has_column(bind, 'doctor_affiliations', 'longitude'):
            batch_op.drop_column('longitude')
        if _has_column(bind, 'doctor_affiliations', 'latitude'):
            batch_op.drop_column('latitude')
