# Lambda Layer Configuration

All Lambda functions in this project require a shared layer to function correctly. This layer provides the necessary database drivers and utility functions.

## Layer Requirements

The `layer.zip` must contain the following components:

1.  **psycopg2-binary**: Required for PostgreSQL database connectivity from Python 3.12.