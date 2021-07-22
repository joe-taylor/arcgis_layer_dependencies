# ArcGIS Layer Dependencies Tracker

This nodejs app assembles a report containing all the maps on the [Government of BC Maps ArcGIS page](https://governmentofbc.maps.arcgis.com/home/search.html?t=content&q=&focus=maps-webmaps) along with their layers and tags. We are using this to track which maps depend on which layers.

## Usage

```bash

npm i # install packages
node src/index.js

```

## Strategy

### 1. Use Rest API to gather all web maps from the search results

Search results have JSON endpoints at URLs that look like this: [https://governmentofbc.maps.arcgis.com/sharing/rest/search?num=100&<strong>start=1</strong>&sortField=&sortOrder=desc&q=%20orgid%3Aubm4tcTYICKBpist%20(type%3A(%22Web%20Map%22%20OR%20%22CityEngine%20Web%20Scene%22)%20-type%3A%22Web%20Mapping%20Application%22)%20%20-type%3A%22Code%20Attachment%22%20-type%3A%22Featured%20Items%22%20-type%3A%22Symbol%20Set%22%20-type%3A%22Color%20Set%22%20-type%3A%22Windows%20Viewer%20Add%20In%22%20-type%3A%22Windows%20Viewer%20Configuration%22%20-type%3A%22Map%20Area%22%20-typekeywords%3A%22MapAreaPackage%22%20-type%3A%22Indoors%20Map%20Configuration%22%20-typekeywords%3A%22SMX%22&f=json](https://governmentofbc.maps.arcgis.com/sharing/rest/search?num=100&start=1&sortField=&sortOrder=desc&q=%20orgid%3Aubm4tcTYICKBpist%20(type%3A(%22Web%20Map%22%20OR%20%22CityEngine%20Web%20Scene%22)%20-type%3A%22Web%20Mapping%20Application%22)%20%20-type%3A%22Code%20Attachment%22%20-type%3A%22Featured%20Items%22%20-type%3A%22Symbol%20Set%22%20-type%3A%22Color%20Set%22%20-type%3A%22Windows%20Viewer%20Add%20In%22%20-type%3A%22Windows%20Viewer%20Configuration%22%20-type%3A%22Map%20Area%22%20-typekeywords%3A%22MapAreaPackage%22%20-type%3A%22Indoors%20Map%20Configuration%22%20-typekeywords%3A%22SMX%22&f=json)

We can paginate through results using the `start` parameter of the above URL. We're expecting to see the following JSON returned. What we're after is in the results section.

```javascript
{

  "total" : int,
  "start" : int,
  "num" : int,
  "nextStart" : int,

  // [ ... ]

  "results": [

    // [ ... ] 

  ]

}

```

Fields of interest from the items in the results list include:

  - `id`
  - `title`
  - `tags`
  - `numViews`

### 2. For each map above, gather the URL/ID, view count, set of tags, and list of attached layers

We can gather some of that information from the search results directly, but for other bits of information (e.g. the list of attached layers) a new request has to be made for each search result. 

### 3. Return all of the above as YAML

We may want to pivot the information in the following ways:

 - Get a flat list of all layers, and in particular, all layers with endpoints that are failing
 - Get a list of layers associated to maps
