<div align="center" dir="auto">
  <img src="external/images/logo.png" alt="Project ACTS Logo">
</div>

![Python](https://img.shields.io/badge/Python-3.7%20%7C%203.8%20%7C%203.9%20%7C%203.10-blue)
![Platform](https://img.shields.io/badge/Google%20Cloud-blue?logo=googlecloud&logoColor=white)

## What is it?

**ACTS API** is a GCP-deployed Backend API for Project ACTS. It contains all the internal API endpoints that the application uses.

## Where to get it?

The source code is currently hosted in GitHub: [https://github.com/project-acts/acts-api](https://github.com/project-acts/acts-api)

## Dependencies

- [ACTS Core - Core Python Library for Project ACTS.](https://github.com/project-acts/acts-core)
- [Flask - is a lightweight WSGI web application framework.](https://flask.palletsprojects.com/)

## Endpoints

Connect to the API through the base URL https://up-project-acts.df.r.appspot.com/

### [**`GET /osm/ways?q=<DATASET_NAME>`**](https://up-project-acts.df.r.appspot.com/osm/ways)

Returns all the way IDs of the given dataset name, together with its list of longitudes and latitudes.
If no query is provided or if the dataset name is invalid or unknown then an empty object is returned.

As of now, because of the current scope of Project ACTS, the only public dataset is [**Quezon City**](https://up-project-acts.df.r.appspot.com/osm/ways?q=quezon+city).

**Response:**
```JSON
{
    "1001273258": [
        [14.6791129, 121.0372508],
        [14.6790529, 121.0373191]
    ],
    "1002463467": [
        [14.649934, 121.0336348],
        [14.6498813, 121.0335461],
        [14.6498689, 121.0335211],
        [14.649799, 121.0333806]
    ]
}
```

## Contribution guidelines

If you want to contribute to **acts-api**, be sure to review the [contribution guidelines](CONTRIBUTING.md). By participating, you are expected to uphold this guidelines.
