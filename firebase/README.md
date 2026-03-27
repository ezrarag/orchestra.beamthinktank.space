Apply the Storage CORS policy manually:

`gsutil cors set firebase/cors.json gs://{your-beam-orchestra-platform-storage-bucket}`

Run this once from a machine with `gsutil` installed and credentials for the target Firebase Storage bucket.
