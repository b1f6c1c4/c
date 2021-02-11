# c

> c for cook

Functions:

- filter based on ingredients
- translate everything into/from Chinese
- Web-based interface

Plan:

1. Keep a list of ingredients available: monday.com/b1f6c1c4/b1pn/Foods
    - Column `Name` in whatever language
    - Column `Key` in English that is searchable in #2
      - Generate automatically if missing, update manually if necessary
    - Column `Genre` within `['Main', 'Individual', 'Disabled', 'Unknown']`
    - Column `Tier` within `['First', 'Second', 'Third', 'Unknown']`
    - Access via API in GraphQL
        - https://monday.com/developers/v2
        - Huge limit, no worries
1. Understand Google Translate API
    - https://cloud.google.com/translate/pricing
    - First 500,000 characters free monthly
1. Understand Recipe Puppy API
    - http://www.recipepuppy.com/about/api/
    - 1000 daily
1. Develop a web interface
    - nodejs+expressjs+pug backend rendering
    - dockerized
    - Upon `POST /api/updateKeys`:
        1. Iterate through ingredients on monday.com
        1. If `!Key && Genre === 'Unknown'`, translate `Name` into `Key`
        1. Report changes
    - Upon `POST /api/classifyGenres?n=<n>`:
        1. Iterate through `<n>` `Key && Genre === 'Unknown'` ingredients on monday.com
        1. Query recipe puppy API
            - If no recipe found, skip
            - If any recipe found, `Genre = 'Main'`
        1. Report changes
    - Upon `GET /`:
         TODO
