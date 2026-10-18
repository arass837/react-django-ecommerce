# NOVA STORE — English-language React + Django Shop

This package contains the English-language UI based on the provided project. Product names in the **existing** SQLite database remain untouched; known demonstration names are translated for display by `frontend/src/translations.js` to preserve associated orders, photos, and product IDs. Newly seeded demo products have English names.

## Start locally

Backend (Python 3.11):
```bash
cd backend
python -m venv env
# activate your environment
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:
```bash
cd frontend
npm install
npm start
```

Public catalog and cart do not require authentication. Sign in to place an order or view order history. Demo checkout **does not charge a payment method**.

## Notes

- The archive intentionally excludes local virtual environments, node_modules, database contents, personal data, and uploaded media. Copy your existing local `db.sqlite3` and `media/` into the backend folder **only for your own use**, not for a public GitHub repository.
- Django Admin UI uses built-in Django translations; the shop's custom model labels and checkout validation strings are in English.
- Existing database shipping method names set by administrators are shown as stored and should be renamed in Django Admin if desired.
- The frontend still displays prices in PLN, with English number formatting.
