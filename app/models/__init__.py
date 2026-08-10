# models package — import all models so Base.metadata discovers them
from app.models.user import User  # noqa: F401
from app.models.group import Group  # noqa: F401
from app.models.participant import Participant  # noqa: F401  (replaces UserGroup)
from app.models.expense import Expense  # noqa: F401
from app.models.expense_share import ExpenseShare  # noqa: F401
