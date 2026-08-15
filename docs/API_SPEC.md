# CodeOracle - OpenAPI & REST Specification

## Base URL
`/api`

---

## 1. System Endpoints

### `GET /api/health`
Checks backend service readiness, version, and environment status.

#### Response `200 OK`
```json
{
  "status": "ok",
  "app_name": "CodeOracle",
  "version": "0.1.0",
  "environment": "development"
}
```

---

## 2. Job Ingestion Endpoints

### `POST /api/jobs/upload`
Uploads a `.zip` file of a legacy codebase for ingestion.

- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Binary ZIP file (max 100MB compressed, 300MB extracted)

#### Response `202 Accepted`
```json
{
  "job_id": "job_12345abc",
  "state": "queued",
  "stage": "Queued",
  "progress_percentage": 0,
  "source_type": "zip",
  "source_url": "legacy_app.zip",
  "project_id": null,
  "message": "ZIP upload accepted and queued for processing.",
  "error_code": null,
  "error_message": null,
  "polling_url": "/api/jobs/job_12345abc",
  "created_at": "2026-08-13T20:45:00Z",
  "updated_at": "2026-08-13T20:45:00Z"
}
```

---

### `POST /api/jobs/github`
Submits a public GitHub repository URL for background ingestion.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "repository_url": "https://github.com/octocat/Hello-World"
}
```

#### Response `202 Accepted`
```json
{
  "job_id": "job_67890def",
  "state": "queued",
  "stage": "Queued",
  "progress_percentage": 0,
  "source_type": "github",
  "source_url": "https://github.com/octocat/Hello-World.git",
  "project_id": null,
  "message": "GitHub repository queued for clone and analysis.",
  "error_code": null,
  "error_message": null,
  "polling_url": "/api/jobs/job_67890def",
  "created_at": "2026-08-13T20:45:00Z",
  "updated_at": "2026-08-13T20:45:00Z"
}
```

---

## 3. Job Status & Results Endpoints

### `GET /api/jobs/{job_id}`
Polls the execution state of an analysis job.

#### Response `200 OK`
```json
{
  "job_id": "job_12345abc",
  "state": "completed",
  "stage": "Completed",
  "progress_percentage": 100,
  "source_type": "zip",
  "source_url": "legacy_app.zip",
  "project_id": "proj_98765xyz",
  "message": "ZIP ingestion complete. Source file inventory ready.",
  "error_code": null,
  "error_message": null,
  "polling_url": "/api/jobs/job_12345abc",
  "created_at": "2026-08-13T20:45:00Z",
  "updated_at": "2026-08-13T20:45:10Z"
}
```

Valid statuses: `queued`, `extracting`, `analyzing`, `generating`, `completed`, `failed`.

---

## 4. Project & File Inventory Endpoints

### `GET /api/projects/{project_id}`
Retrieves metadata for an ingested project. Never exposes server filesystem paths.

#### Response `200 OK`
```json
{
  "project_id": "proj_98765xyz",
  "display_name": "legacy_app.zip",
  "source_type": "zip",
  "source_url": null,
  "detected_languages": ["javascript", "python"],
  "total_files": 12,
  "total_lines": 1450,
  "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "created_at": "2026-08-13T20:45:10Z"
}
```

---

### `GET /api/projects/{project_id}/files`
Retrieves the list of discovered Python, JavaScript, and TypeScript source files.

#### Response `200 OK`
```json
{
  "project_id": "proj_98765xyz",
  "total_files": 2,
  "files": [
    {
      "file_id": "file_01a2b3c4",
      "relative_path": "app/main.py",
      "language": "python",
      "size_bytes": 450,
      "line_count": 22,
      "sha256_hash": "a1b2c3d4e5f6..."
    },
    {
      "file_id": "file_05d6e7f8",
      "relative_path": "frontend/src/index.js",
      "language": "javascript",
      "size_bytes": 1200,
      "line_count": 85,
      "sha256_hash": "f8e7d6c5b4a3..."
    }
  ]
}
```
